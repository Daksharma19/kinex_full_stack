import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";

/**
 * Public patient signup that does NOT depend on email delivery.
 *
 * Supabase's built-in email is rate-limited/unreliable, and with "Confirm email"
 * ON a normal frontend signUp() leaves the user stuck waiting for a mail that may
 * never arrive. Instead we create the auth user server-side with the service-role
 * admin client and `email_confirm: true`, so the account is immediately usable.
 * The frontend then signs in with the same credentials to obtain a session.
 *
 * Creates the Supabase auth user AND the linked PATIENT profile in one call.
 */
export async function registerPatient(req: Request, res: Response) {
  try {
    const { email, password, name, phone, address, dateOfBirth } = req.body;
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "email, password and name are required" });
    }

    // 1. Create the Supabase auth user, email pre-confirmed.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data?.user) {
      // Most common cause: the email is already registered.
      const already = error?.message?.toLowerCase().includes("already");
      return res.status(already ? 409 : 400).json({
        message: already
          ? "An account with this email already exists — try logging in."
          : "Failed to create account",
        error: error?.message,
      });
    }

    // 2. Create the matching PATIENT profile (id = auth user id) + Patient row.
    try {
      const profile = await prisma.profile.create({
        data: {
          id: data.user.id,
          email,
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
      return res.status(201).json({ message: "Account created", profile });
    } catch (profileErr) {
      // Roll back the orphaned auth user so the email can be retried cleanly.
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
      throw profileErr;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to create account",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

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

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = phone || null;

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
          ...(address !== undefined ? { address: address || null } : {}),
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
