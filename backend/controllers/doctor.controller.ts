import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";
import { normalizePhoneOrThrow, sanitizeString } from "../utils/validation.ts";

/**
 * Apply as a doctor. Signup happens on the frontend via supabase.auth.signUp()
 * with email confirmation; the doctor details are stashed and this runs once the
 * applicant confirms their email and is authenticated. requireAuth has verified
 * the token and set req.user — identity comes from the token, not the body.
 * Creates a DOCTOR Profile (id = sub) plus a Doctor row with status PENDING.
 * 409 if a profile exists.
 */
export async function applyAsDoctor(req: Request, res: Response) {
  try {
    const authUser = req.user!;

    const { name, phone, specialization, licenseNumber } = req.body;
    const cleanName = sanitizeString(name);
    const cleanSpecialization = sanitizeString(specialization);
    const cleanLicense = sanitizeString(licenseNumber);
    if (!cleanName || !cleanSpecialization || !cleanLicense) {
      return res.status(400).json({ message: "All fields are required" });
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
        role: "DOCTOR",
        phone: cleanPhone,
        doctor: {
          create: {
            specialization: cleanSpecialization,
            licenseNumber: cleanLicense,
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
 * Editable: profile name/phone and the doctor's specialization + consultation
 * fee. License number and verification status are intentionally not self-editable.
 */
export async function updateMyDoctorProfile(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const { name, phone, specialization, consultationFee } = req.body;

    if (name !== undefined && !sanitizeString(name)) {
      return res.status(400).json({ message: "name cannot be empty" });
    }
    let phoneUpdate: string | null | undefined;
    if (phone !== undefined) {
      try {
        phoneUpdate = normalizePhoneOrThrow(phone);
      } catch (e) {
        return res.status(400).json({ message: (e as Error).message });
      }
    }

    // Consultation fee: whole rupees, non-negative. Empty/null clears it.
    let feeValue: number | null | undefined;
    if (consultationFee !== undefined) {
      if (consultationFee === null || consultationFee === "") {
        feeValue = null;
      } else {
        const n = Number(consultationFee);
        if (!Number.isInteger(n) || n < 0) {
          return res
            .status(400)
            .json({ message: "consultationFee must be a non-negative whole number" });
        }
        feeValue = n;
      }
    }

    const doctorUpdate = {
      ...(specialization !== undefined ? { specialization: sanitizeString(specialization) } : {}),
      ...(feeValue !== undefined ? { consultationFee: feeValue } : {}),
    };

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        ...(name !== undefined ? { name: sanitizeString(name) } : {}),
        ...(phone !== undefined ? { phone: phoneUpdate } : {}),
        ...(Object.keys(doctorUpdate).length > 0
          ? { doctor: { update: doctorUpdate } }
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

// ---- Time slots ----

// Start of "today" (server local time), midnight. Slots may be created only for
// the 3 calendar days AFTER today (today excluded). The bookable window is
// therefore [tomorrow 00:00, today + 4 days 00:00).
function slotWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const windowStart = new Date(start);
  windowStart.setDate(windowStart.getDate() + 1); // tomorrow 00:00
  const windowEnd = new Date(start);
  windowEnd.setDate(windowEnd.getDate() + 4); // day after the 3rd day, 00:00
  return { windowStart, windowEnd };
}

// A valid slot starts on a whole (local) hour, lies inside the 3-day window, and
// is still in the future. Returns the normalized Date or null if invalid.
//
// NOTE: we only require seconds/milliseconds to be zero — NOT minutes. The
// frontend aligns slots to a whole hour in the DOCTOR's local timezone and sends
// the absolute instant (UTC). For half-hour-offset zones (e.g. IST +5:30, the
// minute component in UTC is 30, not 0), so a server-side `getMinutes() === 0`
// check (run in the server's UTC timezone) would wrongly reject every slot.
// Seconds/ms are always zero for a whole-hour instant regardless of timezone,
// and the UI guarantees hourly alignment.
function normalizeSlot(input: unknown): Date | null {
  const d = new Date(input as string);
  if (isNaN(d.getTime())) return null;
  if (d.getSeconds() !== 0 || d.getMilliseconds() !== 0) return null;
  if (d.getTime() <= Date.now()) return null;
  const { windowStart, windowEnd } = slotWindow();
  if (d < windowStart || d >= windowEnd) return null;
  return d;
}

/**
 * DOCTOR-only: open one or more 1-hour slots. Accepts `{ startsAt }` for a
 * single slot or `{ slots: [...] }` for many. Each must start on the hour and
 * fall within the next 3 days (today excluded). Duplicates are skipped silently.
 * Only VERIFIED doctors may publish slots.
 */
export async function createMySlots(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const doctor = await prisma.doctor.findUnique({ where: { profileId } });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
    if (doctor.status !== "VERIFIED")
      return res
        .status(403)
        .json({ message: "Only verified doctors can publish time slots" });

    const raw = Array.isArray(req.body?.slots)
      ? req.body.slots
      : req.body?.startsAt != null
        ? [req.body.startsAt]
        : [];
    if (raw.length === 0)
      return res.status(400).json({ message: "Provide startsAt or a slots array" });

    const valid: Date[] = [];
    for (const r of raw) {
      const d = normalizeSlot(r);
      if (!d)
        return res.status(400).json({
          message:
            "Each slot must start on the hour and fall within the next 3 days (excluding today)",
        });
      valid.push(d);
    }

    await prisma.timeSlot.createMany({
      data: valid.map((startsAt) => ({ doctorId: doctor.id, startsAt })),
      skipDuplicates: true,
    });

    const slots = await prisma.timeSlot.findMany({
      where: { doctorId: doctor.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    return res.status(201).json({ message: "Slots published", slots });
  } catch (error) {
    console.error("Error creating slots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** DOCTOR-only: list the signed-in doctor's own upcoming slots. */
export async function listMySlots(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const doctor = await prisma.doctor.findUnique({ where: { profileId } });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    const slots = await prisma.timeSlot.findMany({
      where: { doctorId: doctor.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    return res.status(200).json({ slots });
  } catch (error) {
    console.error("Error listing slots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** DOCTOR-only: delete one of the doctor's own slots (only if not yet booked). */
export async function deleteMySlot(req: Request, res: Response) {
  try {
    const profileId = req.profile!.id;
    const doctor = await prisma.doctor.findUnique({ where: { profileId } });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    const slot = await prisma.timeSlot.findUnique({ where: { id: req.params.id as string } });
    if (!slot || slot.doctorId !== doctor.id)
      return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked)
      return res.status(409).json({ message: "Cannot remove a booked slot" });

    await prisma.timeSlot.delete({ where: { id: slot.id } });
    return res.status(200).json({ message: "Slot removed" });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Public: list a doctor's available (unbooked, future) slots for booking. */
export async function listDoctorSlots(req: Request, res: Response) {
  try {
    const doctorId = req.params.id as string;
    const slots = await prisma.timeSlot.findMany({
      where: { doctorId, isBooked: false, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    return res.status(200).json({ slots });
  } catch (error) {
    console.error("Error listing doctor slots:", error);
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
