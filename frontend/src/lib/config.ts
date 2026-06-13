/**
 * Centralized frontend config. Bun inlines `process.env.*` references into the
 * client bundle at build time and auto-loads `.env`. All values here are
 * PUBLIC-safe (the anon key is designed to ship to browsers). The service-role
 * key must never appear in frontend code.
 */

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

// Backend API base. Falls back to the local express server's /api/v1 mount.
const API_BASE_URL =
  (process.env.API_BASE_URL as string) || "http://localhost:3000/api/v1";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly in dev rather than silently rendering a broken auth flow.
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in the frontend env — copy .env.example to .env and fill them in (same project as the backend)."
  );
}

export const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  apiBaseUrl: API_BASE_URL,
};
