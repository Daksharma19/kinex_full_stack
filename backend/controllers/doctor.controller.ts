import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { getAuthUser } from "../utils/auth.ts";

/**
 * Apply as a doctor. Requires a valid Supabase access token — identity comes
 * from the token, not the body. Creates a DOCTOR Profile (id = sub) plus a
 * Doctor row with status PENDING. Returns 409 if a profile already exists.
 */
export async function applyAsDoctor(req: Request, res: Response) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ message: "Not authenticated" });

    const { name, phone, specialization, licenseNumber } = req.body;
    if (!name || !specialization || !licenseNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await prisma.profile.findUnique({ where: { id: authUser.id } });
    if (existing) {
      return res.status(409).json({ message: "Profile already exists" });
    }

    const profile = await prisma.profile.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        name,
        role: "DOCTOR",
        phone: phone || null,
        doctor: {
          create: {
            specialization,
            licenseNumber,
          },
        },
      },
      include: { doctor: true },
    });

    return res.status(201).json({
      message: "Doctor application submitted",
      profile,
    });
  } catch (error) {
    console.error("Error applying as doctor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDoctorById(req: Request, res: Response) {
  try {
    const doctorId = req.params.id as string;
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        profile: true,
      },
    });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    return res.status(200).json({ doctor });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
