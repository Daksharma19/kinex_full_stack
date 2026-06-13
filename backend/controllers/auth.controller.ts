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
