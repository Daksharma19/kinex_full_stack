import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";
import { normalizePhoneOrThrow, sanitizeString } from "../utils/validation.ts";

/**
 * Create the application profile for an already-authenticated Supabase user.
 *
 * Supabase owns identity: signup happens on the frontend via supabase.auth
 * .signUp() with email confirmation, and login via signInWithPassword. After the
 * user confirms their email and is authenticated, requireAuth verifies the token
 * and sets req.user; this reads sub/email from it and creates a PATIENT Profile
 * (id = sub) plus the linked Patient row. The display name comes from the
 * request body (the frontend passes the name captured at signup).
 * Returns 409 if a profile already exists for this auth user.
 */
export async function createPatientProfile(req: Request, res: Response) {
  try {
    const authUser = req.user!;

    const { name, phone, address, dateOfBirth } = req.body;
    const cleanName = sanitizeString(name);
    if (!cleanName) {
      return res.status(400).json({ message: "name is required" });
    }
    let cleanPhone: string | null;
    try {
      cleanPhone = normalizePhoneOrThrow(phone);
    } catch (e) {
      return res.status(400).json({ message: (e as Error).message });
    }

    const existing = await prisma.profile.findUnique({ where: { id: authUser.id } });
    if (existing) {
      return res.status(409).json({ message: "Profile already exists" });
    }

    const profile = await prisma.profile.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        name: cleanName,
        role: "PATIENT",
        phone: cleanPhone,
        patient: {
          create: {
            address: sanitizeString(address) || null,
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

const AVATAR_BUCKET = "avatars";

/**
 * Update the signed-in user's own profile. Any authenticated profile may call it.
 * Common fields (name/phone) apply to everyone; dateOfBirth/address are written
 * to the linked Patient row only for PATIENT callers.
 */
export async function updateMyProfile(req: Request, res: Response) {
  try {
    const caller = req.profile!;
    const { name, phone, dateOfBirth, address, latitude, longitude } = req.body;

    if (name !== undefined && !sanitizeString(name)) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = sanitizeString(name);
    if (phone !== undefined) {
      try {
        data.phone = normalizePhoneOrThrow(phone);
      } catch (e) {
        return res.status(400).json({ message: (e as Error).message });
      }
    }

    const patientFieldsTouched =
      dateOfBirth !== undefined ||
      address !== undefined ||
      latitude !== undefined ||
      longitude !== undefined;

    if (caller.role === "PATIENT" && patientFieldsTouched) {
      data.patient = {
        update: {
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
          ...(address !== undefined ? { address: sanitizeString(address) || null } : {}),
          // Coordinates: accept a number, or clear with null. Ignore anything
          // that isn't a finite number so a bad payload can't corrupt the row.
          ...(latitude !== undefined
            ? { latitude: Number.isFinite(latitude) ? latitude : null }
            : {}),
          ...(longitude !== undefined
            ? { longitude: Number.isFinite(longitude) ? longitude : null }
            : {}),
        },
      };
    }

    const profile = await prisma.profile.update({
      where: { id: caller.id },
      data,
      include: { patient: true, doctor: true },
    });

    return res.status(200).json({ message: "Profile updated", profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Upload/replace the signed-in user's profile photo. Accepts a base64 data URL,
 * stores it in the public `avatars` bucket (auto-created) via the service-role
 * client, and saves the public URL. Any authenticated profile may call it.
 */
export async function uploadMyPhoto(req: Request, res: Response) {
  try {
    const caller = req.profile!;
    const { image, contentType } = req.body as { image?: string; contentType?: string };
    if (!image) return res.status(400).json({ message: "image is required" });

    let base64 = image;
    let ct = contentType || "image/png";
    const m = /^data:(.+);base64,(.*)$/.exec(image);
    if (m) {
      ct = m[1] ?? ct;
      base64 = m[2] ?? "";
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) return res.status(400).json({ message: "Invalid image data" });

    await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, { public: true }).catch(() => {});

    const ext = (ct.split("/")[1] || "png").replace("+xml", "");
    const path = `${caller.id}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });
    if (upErr) {
      console.error("Photo upload failed:", upErr);
      return res.status(500).json({ message: "Failed to store image", error: upErr.message });
    }

    const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

    const profile = await prisma.profile.update({
      where: { id: caller.id },
      data: { photoUrl },
      include: { patient: true, doctor: true },
    });

    return res.status(200).json({ message: "Photo updated", profile });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Return the authenticated user's profile plus its patient/doctor relation.
 * Guarded by requireAuth only (not requireProfile), so a user who has signed up
 * but not yet onboarded gets { profile: null } — the frontend uses that to send
 * them into profile creation.
 */
export async function getMe(req: Request, res: Response) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
      include: { patient: true, doctor: true },
    });

    return res.status(200).json({ profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
