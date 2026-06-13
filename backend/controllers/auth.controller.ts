import { type Request, type Response } from "express";
import { prisma } from "../db.ts";

/**
 * Create the application profile for an already-authenticated Supabase user.
 *
 * Supabase owns identity (signup/login happen on the frontend via supabase-js).
 * requireAuth has verified the token and set req.user; this reads sub/email from
 * it and creates a PATIENT Profile (id = sub) plus the linked Patient row.
 * Returns 409 if a profile already exists for this auth user.
 */
export async function createPatientProfile(req: Request, res: Response) {
  try {
    const authUser = req.user!;

    const { name, phone, address, dateOfBirth } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
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
        role: "PATIENT",
        phone: phone || null,
        patient: {
          create: {
            address: address || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          },
        },
      },
      include: { patient: true },
    });

    return res.status(201).json({
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to create profile",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Return the authenticated user's profile plus its patient/doctor relation.
 * requireAuth + requireProfile guarantee a profile exists, so this just loads
 * the relations for the caller.
 */
export async function getMe(req: Request, res: Response) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.profile!.id },
      include: { patient: true, doctor: true },
    });

    return res.status(200).json({ profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
