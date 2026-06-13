/**
 * Centralized frontend config. Bun only inlines env vars prefixed with
 * `BUN_PUBLIC_` into the client/browser bundle (and auto-loads `.env`), so the
 * references below MUST use that prefix — otherwise `process` is undefined in
 * the browser. All values here are PUBLIC-safe (the anon key is designed to
 * ship to browsers). The service-role key must never appear in frontend code.
 */

const SUPABASE_URL = process.env.BUN_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.BUN_PUBLIC_SUPABASE_ANON_KEY as string;

// Backend API base. Falls back to the local express server's /api/v1 mount.
const API_BASE_URL =
  (process.env.BUN_PUBLIC_API_BASE_URL as string) ||
  "http://localhost:3000/api/v1";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly in dev rather than silently rendering a broken auth flow.
  throw new Error(
    "Missing BUN_PUBLIC_SUPABASE_URL or BUN_PUBLIC_SUPABASE_ANON_KEY in the frontend env — copy .env.example to .env and fill them in (same project as the backend)."
  );
}

export const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  apiBaseUrl: API_BASE_URL,
};
