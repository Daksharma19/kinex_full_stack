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
