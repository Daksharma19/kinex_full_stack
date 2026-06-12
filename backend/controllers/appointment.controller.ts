import { type Request, type Response } from "express";
import { prisma } from "../db";
import { getAuthUser } from "../utils/auth.ts";

const VALID_MODE = ["ONLINE", "HOME_VISIT"];
const VALID_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"];

// create appointment
export async function createAppointment(req: Request, res: Response) {
  try {
    const caller = getAuthUser(req);
    if (!caller) return res.status(401).json({ message: "Not Authenticated" });
    if (caller.role !== "PATIENT")
      return res
        .status(403)
        .json({ message: "Only Patients can book appointments" });

    const { doctorId, mode, scheduledAt, notes } = req.body;
    if (!doctorId || !mode || !scheduledAt)
      return res.status(400).json({
        message: "All fields are required",
      });
    if (!VALID_MODE.includes(mode))
      return res
        .status(400)
        .json({ message: "Mode must be ONLINE or HOME_VISIT" });

    const when = new Date(scheduledAt);
    if (isNaN(when.getTime()) || when.getTime() < Date.now())
      return res.status(400).json({
        message: "scheduledAt must be a valid future date",
      });
    const patient = await prisma.patient.findUnique({
      where: { userId: caller.id },
    });
    // console.log(`Patient ID: ${patient?.id}`);
    // console.log(`Caller ID: ${caller?.id}`);

    if (!patient)
      return res.status(404).json({
        message: "Patient Not Found!",
      });
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    // console.log(`doctor ${doctor?.id}`);

    console.log(`Doctor: ${doctor}`);

    if (!doctor || doctor.status !== "VERIFIED") {
      // console.log(`Doctor: ${doctor}, Status: ${doctor?.status}`);
      return res.status(404).json({
        message: "Doctor Not Found!",
      });
    }
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        mode,
        scheduledAt,
        notes: notes || "",
      },
    });
    return res.status(200).json({
      message: "Appointment Successfully Booked",
      appointment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

// get all appointments for a user
export async function listMyAppointments(req: Request, res: Response) {
  try {
    const caller = getAuthUser(req);
    if (!caller) return res.status(401).json({ message: "Not authenticated" });

    let where = {};
    if (caller.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: caller.id } });
      if (!patient) return res.status(404).json({ message: "Patient profile not found" });
      where = { patientId: patient.id };
    } else if (caller.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: caller.id } });
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      where = { doctorId: doctor.id };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// get appointment by Id
export async function getAppointmentById(req: Request, res: Response) {
  try {
    const caller = getAuthUser(req);
    if (!caller) return res.status(401).json({ message: "Not authenticated" });

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { include: { user: { select: { id: true, name: true, email: true } } } },
        doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
        payment: true,
      },
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const isParticipant =
      appointment.patient.user.id === caller.id ||
      appointment.doctor.user.id === caller.id;
    if (!isParticipant && caller.role !== "ADMIN") {
      return res.status(403).json({ message: "Not allowed to view this appointment" });
    }

    return res.status(200).json({ appointment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// update appointment
export async function updateAppointmentStatus(req: Request, res: Response) {
  try {
    const caller = getAuthUser(req);
    if (!caller) return res.status(401).json({ message: "Not authenticated" });

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: "status must be CONFIRMED, COMPLETED or CANCELLED" });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    let allowed = caller.role === "ADMIN";
    if (caller.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: caller.id } });
      allowed = doctor?.id === appointment.doctorId; // must be the doctor on THIS appointment
    }
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed to update this appointment" });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status },
    });

    return res.status(200).json({
      message: `Appointment ${status.toLowerCase()}`,
      appointment: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
