import { config } from "./config";
import { supabase } from "./supabase";

/**
 * Thin fetch wrapper for the backend API.
 *
 * - Prefixes every path with the configured API base URL (so the frontend has a
 *   single source of truth for where the backend lives).
 * - Pulls the current Supabase access token from the shared client and attaches
 *   it as `Authorization: Bearer <token>` — exactly what the backend's
 *   requireAuth middleware expects (it verifies via supabase.auth.getClaims()).
 * - Throws an Error carrying the HTTP status + server message on non-2xx.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = body?.message || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body as T;
}

/** Shape of the backend's GET /auth/me response. */
export interface MeResponse {
  profile: {
    id: string;
    email: string;
    name: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    patient?: unknown;
    doctor?: unknown;
  } | null;
}

/** Load the authenticated user's app profile (null if not onboarded yet). */
export async function getMe(): Promise<MeResponse> {
  try {
    return await apiFetch<MeResponse>("/auth/me");
  } catch (err) {
    // Treat "profile not found" as a not-yet-onboarded user rather than an error,
    // so callers can branch on profile === null uniformly.
    if ((err as { status?: number }).status === 404) return { profile: null };
    throw err;
  }
}

/**
 * Register a new patient (public). The backend creates the auth user with email
 * pre-confirmed AND the profile, so no email confirmation is needed. After this
 * resolves, sign in with the same credentials to get a session.
 */
export function signUpPatient(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * sessionStorage key used to carry doctor-apply form details across the Google
 * OAuth redirect. Set before redirecting; consumed (and cleared) once the user
 * comes back authenticated. See AuthContext + DoctorApplyPage.
 */
export const DOCTOR_APPLY_INTENT_KEY = "doctorApplyIntent";

/** Fields a doctor provides when applying. */
export interface DoctorDetails {
  name: string;
  specialization: string;
  licenseNumber: string;
  phone?: string;
}

/**
 * Register a new doctor via email/password (public). Backend creates the
 * pre-confirmed auth user + DOCTOR profile (status PENDING). Sign in afterwards
 * to get a session.
 */
export function signUpDoctor(input: DoctorDetails & { email: string; password: string }) {
  return apiFetch("/doctor/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Apply as a doctor for an ALREADY-authenticated user (e.g. after Google login).
 * Identity comes from the token; only the doctor details are sent.
 */
export function applyDoctor(input: DoctorDetails) {
  return apiFetch("/doctor/apply", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Create the PATIENT profile for the current authenticated Supabase user. */
export function createPatientProfile(input: {
  name: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}) {
  return apiFetch("/auth/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
