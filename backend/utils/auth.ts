import { type Request } from "express";
import { prisma } from "../db.ts";
import { supabase } from "./supabase.ts";
import type { Profile } from "../generated/prisma/client";

/**
 * The authenticated Supabase identity, extracted from a verified access token.
 * `id` is the Supabase auth user id (auth.users.id), which is also profiles.id.
 */
export interface AuthUser {
  id: string;
  email: string | undefined;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.split(" ")[1] ?? null;
}

/**
 * Verify the incoming Supabase access token and return the auth identity.
 *
 * Uses supabase.auth.getClaims(), which validates Supabase's asymmetric ES256
 * tokens via the project's JWKS. Returns null on any failure (missing/invalid/
 * expired token).
 *
 * NOTE: the `role` claim in a Supabase token is the Postgres role
 * (e.g. "authenticated"), NOT the application role. App role (PATIENT/DOCTOR/
 * ADMIN) lives on the profiles table — use getAuthProfile() for role checks.
 */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return null;
    const claims = data.claims;
    return { id: claims.sub as string, email: claims.email as string | undefined };
  } catch {
    return null;
  }
}

/**
 * Verify the token AND load the matching profile (with the app role) from the
 * database. Returns null if the token is invalid OR no profile exists yet for
 * this auth user (i.e. the user signed up but hasn't created a profile).
 *
 * Use this anywhere an app role check is needed.
 */
export async function getAuthProfile(req: Request): Promise<Profile | null> {
  const authUser = await getAuthUser(req);
  if (!authUser) return null;
  const profile = await prisma.profile.findUnique({ where: { id: authUser.id } });
  return profile ?? null;
}
