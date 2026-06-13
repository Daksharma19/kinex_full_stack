import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";

/**
 * Public doctor signup (email/password) that does NOT depend on email delivery.
 *
 * Mirrors auth.registerPatient but creates a DOCTOR profile + Doctor row with
 * status PENDING. The backend creates the Supabase auth user server-side with
 * `email_confirm: true`; the frontend then signs in to get a session. The new
 * doctor isn't bookable until an admin verifies them.
 */
export async function registerDoctor(req: Request, res: Response) {
  try {
    const { email, password, name, phone, specialization, licenseNumber } =
      req.body;
    if (!email || !password || !name || !specialization || !licenseNumber) {
      return res.status(400).json({
        message:
          "email, password, name, specialization and licenseNumber are required",
      });
    }

    // 1. Create the Supabase auth user, email pre-confirmed.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data?.user) {
      const already = error?.message?.toLowerCase().includes("already");
      return res.status(already ? 409 : 400).json({
        message: already
          ? "An account with this email already exists — try logging in."
          : "Failed to create account",
        error: error?.message,
      });
    }

    // 2. Create the matching DOCTOR profile + Doctor row (status PENDING).
    try {
      const profile = await prisma.profile.create({
        data: {
          id: data.user.id,
          email,
          name,
          role: "DOCTOR",
          phone: phone || null,
          doctor: { create: { specialization, licenseNumber } },
        },
        include: { doctor: true },
      });
      return res
        .status(201)
        .json({ message: "Doctor application submitted", profile });
    } catch (profileErr) {
      // Roll back the orphaned auth user so the email can be retried cleanly.
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
      throw profileErr;
    }
  } catch (error) {
    console.error("Error registering doctor:", error);
    return res.status(500).json({
      message: "Failed to submit doctor application",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Apply as a doctor. requireAuth has verified the token and set req.user —
 * identity comes from the token, not the body. Creates a DOCTOR Profile
 * (id = sub) plus a Doctor row with status PENDING. 409 if a profile exists.
 */
export async function applyAsDoctor(req: Request, res: Response) {
  try {
    const authUser = req.user!;

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

const AVATAR_BUCKET = "avatars";

/**
 * Update the signed-in doctor's own profile. DOCTOR-only (route middleware).
 * Editable: profile name/phone and the doctor's specialization. License number
 * and verification status are intentionally not self-editable.
 */
export async function updateMyDoctorProfile(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const { name, phone, specialization } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(specialization !== undefined
          ? { doctor: { update: { specialization } } }
          : {}),
      },
      include: { doctor: true },
    });

    return res.status(200).json({ message: "Profile updated", profile });
  } catch (error) {
    console.error("Error updating doctor profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Upload/replace the signed-in doctor's profile photo. Accepts a base64 data URL
 * (or raw base64 + contentType), stores it in the public `avatars` bucket via the
 * service-role client (bucket auto-created if missing), and saves the public URL
 * on the profile. DOCTOR-only (route middleware).
 */
export async function uploadMyPhoto(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const { image, contentType } = req.body as { image?: string; contentType?: string };
    if (!image) return res.status(400).json({ message: "image is required" });

    // Accept a data URL ("data:image/png;base64,....") or raw base64.
    let base64 = image;
    let ct = contentType || "image/png";
    const m = /^data:(.+);base64,(.*)$/.exec(image);
    if (m) {
      ct = m[1] ?? ct;
      base64 = m[2] ?? "";
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) return res.status(400).json({ message: "Invalid image data" });

    // Ensure the public bucket exists (idempotent — ignore "already exists").
    await supabaseAdmin.storage
      .createBucket(AVATAR_BUCKET, { public: true })
      .catch(() => {});

    const ext = (ct.split("/")[1] || "png").replace("+xml", "");
    const path = `${profileId}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });
    if (upErr) {
      console.error("Photo upload failed:", upErr);
      return res.status(500).json({ message: "Failed to store image", error: upErr.message });
    }

    const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the browser fetches the new image after an overwrite.
    const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: { photoUrl },
      include: { doctor: true },
    });

    return res.status(200).json({ message: "Photo updated", profile });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Public list of bookable (VERIFIED) doctors. Patients pick from this to book.
 */
export async function listVerifiedDoctors(_req: Request, res: Response) {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { status: "VERIFIED" },
      include: { profile: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ doctors });
  } catch (error) {
    console.error("Error listing doctors:", error);
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
