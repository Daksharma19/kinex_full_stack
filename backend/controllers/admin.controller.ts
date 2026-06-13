import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";

// All handlers here run behind requireAuth + requireProfile + requireRole("ADMIN"),
// so req.profile is guaranteed to be an ADMIN.

export async function listDoctorApplication(req: Request, res: Response) {
  try {
    const statusFilter = ((req.query.status as string) || "PENDING").toLowerCase();
    if (!["pending", "verified", "rejected"].includes(statusFilter)) {
      return res.status(400).json({ message: "Invalid status filter" });
    }
    const doctors = await prisma.doctor.findMany({
      where: { status: statusFilter.toUpperCase() as any },
      include: { profile: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({
      message: "Success",
      doctors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function verifyDoctor(req: Request, res: Response) {
  try {
    const admin = req.profile!;
    const doctorId = req.params.id as string;
    const { status } = req.body;
    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "status must be VERIFIED or REJECTED",
      });
    }
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }
    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        status,
        verifiedById: admin.id,
        verifiedAt: new Date(),
      },
    });
    res.status(200).json({
      message: `Doctor ${status.toLowerCase()}`,
      doctor: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * List every registered user (profile), so an admin can pick one to promote.
 * ADMIN-only via route middleware.
 */
export async function listUsers(req: Request, res: Response) {
  try {
    const users = await prisma.profile.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Promote an existing registered user to ADMIN by flipping their profile role.
 * ADMIN-only via route middleware. 404 if the profile doesn't exist, 409 if the
 * user is already an admin.
 */
export async function promoteToAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }
    if (profile.role === "ADMIN") {
      return res.status(409).json({ message: "User is already an admin" });
    }
    const updated = await prisma.profile.update({
      where: { id },
      data: { role: "ADMIN" },
    });
    return res.status(200).json({ message: "User promoted to admin", profile: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Permanently and completely delete a user. ADMIN-only via route middleware.
 *
 * Order matters because of FK constraints:
 *   payments → appointments (restrict)
 *   appointments → patients/doctors (restrict)
 *   patients/doctors → profile (cascade)
 * So inside one transaction we delete the user's payments, then their
 * appointments (as patient or doctor), then the profile — which cascades the
 * patient/doctor rows. Finally we remove the Supabase auth user with the
 * service-role client so the account can never log in again.
 *
 * The DB work is transactional (all-or-nothing). The auth deletion happens after
 * the transaction commits; if it fails we report that the records were removed
 * but the auth user needs manual cleanup, rather than leaving the DB half-gone.
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const targetId = req.params.id as string;
    const admin = req.profile!;

    if (targetId === admin.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own admin account" });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: targetId },
      include: { patient: true, doctor: true },
    });
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Remove every DB record for this user, atomically.
    await prisma.$transaction(async (tx) => {
      const apptFilter: { patientId?: string; doctorId?: string }[] = [];
      if (profile.patient) apptFilter.push({ patientId: profile.patient.id });
      if (profile.doctor) apptFilter.push({ doctorId: profile.doctor.id });

      if (apptFilter.length > 0) {
        const appts = await tx.appointment.findMany({
          where: { OR: apptFilter },
          select: { id: true },
        });
        const apptIds = appts.map((a) => a.id);
        if (apptIds.length > 0) {
          await tx.payment.deleteMany({
            where: { appointmentId: { in: apptIds } },
          });
          await tx.appointment.deleteMany({ where: { id: { in: apptIds } } });
        }
      }

      // Cascades to the patient/doctor rows (onDelete: Cascade on those).
      await tx.profile.delete({ where: { id: targetId } });
    });

    // 2. Permanently delete the Supabase auth user (service-role key).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (error) {
      console.error("Auth user deletion failed after DB cleanup:", error);
      return res.status(500).json({
        message:
          "User records were deleted, but removing the auth account failed — delete it manually in Supabase → Authentication.",
        error: error.message,
      });
    }

    return res.status(200).json({ message: "User permanently deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      message: "Failed to delete user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create a new ADMIN. Gated to ADMIN callers (via route middleware). Uses the
 * SERVICE_ROLE admin client to create the Supabase auth user (email pre-confirmed),
 * then creates the matching ADMIN Profile keyed by the new auth user's id.
 */
export async function createAdmin(req: Request, res: Response) {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: "email, password and name are required" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data?.user) {
      return res.status(400).json({
        message: "Failed to create auth user",
        error: error?.message,
      });
    }

    const profile = await prisma.profile.create({
      data: {
        id: data.user.id,
        email,
        name,
        role: "ADMIN",
        phone: phone || null,
      },
    });

    return res.status(201).json({
      message: "Admin created",
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
