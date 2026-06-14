import { type Request, type Response } from "express";
import { prisma } from "../db";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "../utils/razorpay";

const VALID_MODE = ["ONLINE", "HOME_VISIT"];

/**
 * Start a booking — gated to PATIENT by requireRole.
 *
 * The patient picks an available slot; this reserves the slot, creates a PENDING
 * appointment and a PENDING payment, opens a Razorpay order, and returns the
 * order so the frontend can launch checkout. The appointment is only CONFIRMED
 * once payment is verified (see verifyAppointmentPayment). Reserving the slot
 * atomically (updateMany where isBooked=false) prevents two patients grabbing
 * the same hour.
 */
export async function createAppointment(req: Request, res: Response) {
  try {
    const caller = req.profile!;

    const { slotId, mode, notes } = req.body;
    if (!slotId || !mode)
      return res.status(400).json({ message: "slotId and mode are required" });
    if (!VALID_MODE.includes(mode))
      return res.status(400).json({ message: "Mode must be ONLINE or HOME_VISIT" });

    if (!isRazorpayConfigured)
      return res
        .status(503)
        .json({ message: "Online payment is not configured. Please try again later." });

    const patient = await prisma.patient.findUnique({ where: { profileId: caller.id } });
    if (!patient) return res.status(404).json({ message: "Patient Not Found!" });

    const slot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      include: { doctor: true },
    });
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked)
      return res.status(409).json({ message: "That slot has just been taken" });
    if (slot.startsAt.getTime() <= Date.now())
      return res.status(400).json({ message: "That slot is in the past" });
    if (slot.doctor.status !== "VERIFIED")
      return res.status(404).json({ message: "Doctor Not Found!" });

    const fee = slot.doctor.consultationFee;
    if (fee == null || fee <= 0)
      return res
        .status(400)
        .json({ message: "This doctor has not set a consultation fee yet" });
    const amountPaise = fee * 100;

    // Atomically reserve the slot. If another booking won the race, count is 0.
    const reserved = await prisma.timeSlot.updateMany({
      where: { id: slot.id, isBooked: false },
      data: { isBooked: true },
    });
    if (reserved.count === 0)
      return res.status(409).json({ message: "That slot has just been taken" });

    try {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: slot.doctorId,
          slotId: slot.id,
          mode,
          scheduledAt: slot.startsAt,
          notes: notes || "",
        },
      });

      // Razorpay caps the receipt at 40 chars; the bare UUID (36) fits.
      const order = await createRazorpayOrder(amountPaise, appointment.id);

      await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          amountPaise: BigInt(amountPaise),
          gatewayOrderId: order.id,
          status: "PENDING",
        },
      });

      return res.status(201).json({
        message: "Booking started — complete payment to confirm",
        appointment,
        payment: {
          orderId: order.id,
          amount: amountPaise,
          currency: "INR",
          keyId: razorpayKeyId,
        },
      });
    } catch (inner) {
      // Roll back the reservation so the slot is bookable again.
      await prisma.timeSlot.updateMany({
        where: { id: slot.id },
        data: { isBooked: false },
      });
      throw inner;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Verify a Razorpay payment and auto-confirm the appointment — PATIENT-only,
 * and only the patient who owns the appointment. On a valid signature the
 * payment is marked VERIFIED and the appointment becomes CONFIRMED (the slot
 * stays locked). An invalid signature marks the payment FAILED and frees the
 * slot so the patient can try again.
 */
export async function verifyAppointmentPayment(req: Request, res: Response) {
  try {
    const caller = req.profile!;
    const appointmentId = req.params.id as string;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ message: "Missing payment confirmation fields" });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { profile: { select: { id: true } } } }, payment: true },
    });
    if (!appointment || !appointment.payment)
      return res.status(404).json({ message: "Appointment not found" });
    if (appointment.patient.profile.id !== caller.id)
      return res.status(403).json({ message: "Not allowed to pay for this appointment" });
    if (appointment.status !== "PENDING")
      return res.status(409).json({ message: "Appointment is no longer awaiting payment" });

    const valid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!valid) {
      // Mark the payment failed, cancel the appointment, and release the slot —
      // detaching slotId (it's unique) so the freed slot can be booked again.
      const ops: any[] = [
        prisma.payment.update({
          where: { id: appointment.payment.id },
          data: { status: "FAILED", gatewayPaymentId: razorpay_payment_id },
        }),
        prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "CANCELLED", slotId: null },
        }),
      ];
      if (appointment.slotId)
        ops.push(
          prisma.timeSlot.update({
            where: { id: appointment.slotId },
            data: { isBooked: false },
          })
        );
      await prisma.$transaction(ops);
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const [, updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: appointment.payment.id },
        data: { status: "VERIFIED", gatewayPaymentId: razorpay_payment_id },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CONFIRMED" },
      }),
    ]);

    return res
      .status(200)
      .json({ message: "Payment verified — appointment confirmed", appointment: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// get all appointments for a user
export async function listMyAppointments(req: Request, res: Response) {
  try {
    const caller = req.profile!;

    let where = {};
    if (caller.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { profileId: caller.id } });
      if (!patient) return res.status(404).json({ message: "Patient profile not found" });
      where = { patientId: patient.id };
    } else if (caller.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { profileId: caller.id } });
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      where = { doctorId: doctor.id };
    }

    const rows = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: { profile: { select: { name: true, email: true, phone: true } } },
        },
        doctor: { include: { profile: { select: { name: true, email: true } } } },
        payment: { select: { status: true, amountPaise: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Convert the payment's BigInt amount (paise) to a JSON-safe rupee number.
    const appointments = rows.map((a) => ({
      ...a,
      payment: a.payment
        ? { status: a.payment.status, amount: Number(a.payment.amountPaise) / 100 }
        : null,
    }));

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// get appointment by Id
export async function getAppointmentById(req: Request, res: Response) {
  try {
    const caller = req.profile!;

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id as string },
      include: {
        patient: { include: { profile: { select: { id: true, name: true, email: true } } } },
        doctor: { include: { profile: { select: { id: true, name: true, email: true } } } },
        payment: true,
      },
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const isParticipant =
      appointment.patient.profile.id === caller.id ||
      appointment.doctor.profile.id === caller.id;
    if (!isParticipant && caller.role !== "ADMIN") {
      return res.status(403).json({ message: "Not allowed to view this appointment" });
    }

    return res.status(200).json({ appointment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Release an unpaid (PENDING) booking — PATIENT-only, owner-only. Called when
 * the patient closes the Razorpay checkout without paying: deletes the pending
 * payment + appointment and frees the reserved slot. A CONFIRMED appointment
 * cannot be released here (only an admin can cancel a paid one).
 */
export async function releaseAppointment(req: Request, res: Response) {
  try {
    const caller = req.profile!;
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id as string },
      include: { patient: { include: { profile: { select: { id: true } } } }, payment: true },
    });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (appointment.patient.profile.id !== caller.id)
      return res.status(403).json({ message: "Not allowed to release this appointment" });
    if (appointment.status !== "PENDING")
      return res.status(409).json({ message: "Only a pending booking can be released" });

    const ops: any[] = [];
    if (appointment.payment)
      ops.push(prisma.payment.delete({ where: { id: appointment.payment.id } }));
    if (appointment.slotId)
      ops.push(
        prisma.timeSlot.update({
          where: { id: appointment.slotId },
          data: { isBooked: false },
        })
      );
    ops.push(prisma.appointment.delete({ where: { id: appointment.id } }));
    await prisma.$transaction(ops);

    return res.status(200).json({ message: "Booking released" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * TEMPORARY (admin-only): hard-delete an appointment from the database, along
 * with its payment row, and free the slot. This is a maintenance/cleanup tool —
 * unlike CANCELLED it leaves no record. Remove once no longer needed.
 */
export async function adminDeleteAppointment(req: Request, res: Response) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id as string },
      include: { payment: true },
    });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const ops: any[] = [];
    if (appointment.payment)
      ops.push(prisma.payment.delete({ where: { id: appointment.payment.id } }));
    if (appointment.slotId)
      ops.push(
        prisma.timeSlot.update({
          where: { id: appointment.slotId },
          data: { isBooked: false },
        })
      );
    ops.push(prisma.appointment.delete({ where: { id: appointment.id } }));
    await prisma.$transaction(ops);

    return res.status(200).json({ message: "Appointment deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an appointment's status, enforcing the workflow:
 *   - CONFIRMED happens automatically on payment success — never set manually.
 *   - COMPLETED: only the doctor on the appointment, and only from CONFIRMED.
 *   - CANCELLED: ADMIN only. Frees the slot and refunds a verified payment.
 */
export async function updateAppointmentStatus(req: Request, res: Response) {
  try {
    const caller = req.profile!;
    const { status } = req.body;

    if (status === "CONFIRMED")
      return res.status(400).json({
        message: "Appointments are confirmed automatically on payment",
      });
    if (status !== "COMPLETED" && status !== "CANCELLED")
      return res.status(400).json({ message: "status must be COMPLETED or CANCELLED" });

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id as string },
      include: { payment: true },
    });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (status === "CANCELLED") {
      // Only an admin may cancel.
      if (caller.role !== "ADMIN")
        return res.status(403).json({ message: "Only an admin can cancel an appointment" });
      if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED")
        return res
          .status(409)
          .json({ message: `Cannot cancel a ${appointment.status.toLowerCase()} appointment` });

      const ops: any[] = [
        prisma.appointment.update({
          where: { id: appointment.id },
          // Detach the unique slot link so the freed slot can be rebooked.
          data: { status: "CANCELLED", slotId: null },
        }),
      ];
      // Free the slot so it can be booked again.
      if (appointment.slotId)
        ops.push(
          prisma.timeSlot.update({
            where: { id: appointment.slotId },
            data: { isBooked: false },
          })
        );
      // Mark a paid appointment as refunded.
      if (appointment.payment?.status === "VERIFIED")
        ops.push(
          prisma.payment.update({
            where: { id: appointment.payment.id },
            data: { status: "REFUNDED" },
          })
        );
      const [updated] = await prisma.$transaction(ops);
      return res.status(200).json({ message: "Appointment cancelled", appointment: updated });
    }

    // status === "COMPLETED": only the doctor on this appointment, from CONFIRMED.
    if (caller.role !== "DOCTOR")
      return res.status(403).json({ message: "Only the doctor can mark an appointment completed" });
    const doctor = await prisma.doctor.findUnique({ where: { profileId: caller.id } });
    if (doctor?.id !== appointment.doctorId)
      return res.status(403).json({ message: "Not allowed to update this appointment" });
    if (appointment.status !== "CONFIRMED")
      return res
        .status(409)
        .json({ message: "Only a confirmed appointment can be marked completed" });

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED" },
    });
    return res.status(200).json({ message: "Appointment completed", appointment: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
