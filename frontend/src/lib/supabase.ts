import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * The single, shared Supabase browser client for the whole frontend.
 *
 * Import this module anywhere you need auth — do NOT call createClient() again
 * elsewhere. A second instance would keep its own session and the two would
 * drift out of sync (the classic "logged in over here, logged out over there"
 * bug).
 *
 * Unlike the backend client (which is stateless and only verifies tokens), this
 * one persists the session to localStorage and auto-refreshes the access token
 * so the user stays logged in across reloads.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
