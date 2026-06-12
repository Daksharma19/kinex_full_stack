import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY — set them in .env (Supabase dashboard → Project Settings → API)"
  );
}

/**
 * Public client built with the ANON key. Used to VERIFY incoming Supabase
 * access tokens (via supabase.auth.getClaims). Never holds a session.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Admin client built with the SERVICE_ROLE key. Bypasses RLS and can manage
 * auth users. Use ONLY on trusted server-side paths (admin/seed creation of
 * auth users). NEVER expose this key to the frontend.
 */
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
