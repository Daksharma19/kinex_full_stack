import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { getAuthProfile } from "../utils/auth.ts";
import { supabaseAdmin } from "../utils/supabase.ts";

export async function listDoctorApplication(req: Request, res: Response) {
  try {
    const admin = await getAuthProfile(req);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }
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
    const admin = await getAuthProfile(req);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }
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
 * Create a new ADMIN. Gated to ADMIN callers. Uses the SERVICE_ROLE admin client
 * to create the Supabase auth user (email pre-confirmed), then creates the
 * matching ADMIN Profile keyed by the new auth user's id.
 */
export async function createAdmin(req: Request, res: Response) {
  try {
    const caller = await getAuthProfile(req);
    if (!caller || caller.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

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
