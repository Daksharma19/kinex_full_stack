import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { getAuthUser } from "../utils/auth.ts";

/**
 * Create the application profile for an already-authenticated Supabase user.
 *
 * Supabase owns identity (signup/login happen on the frontend via supabase-js).
 * This endpoint takes the verified access token, reads `sub`/`email` from it,
 * and creates a PATIENT Profile (id = sub) plus the linked Patient row.
 * Returns 409 if a profile already exists for this auth user.
 */
export async function createPatientProfile(req: Request, res: Response) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ message: "Not authenticated" });

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
 * Return the authenticated user's profile (plus patient/doctor relation).
 *
 * If the token is valid but the user has NO profile yet, responds 200 with
 * { profile: null } so the frontend knows to route them to profile creation.
 */
export async function getMe(req: Request, res: Response) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ message: "Not authenticated" });

    const profile = await prisma.profile.findUnique({
      where: { id: authUser.id },
      include: { patient: true, doctor: true },
    });

    if (!profile) {
      // Authenticated with Supabase but hasn't created an app profile yet.
      return res.status(200).json({ profile: null });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
