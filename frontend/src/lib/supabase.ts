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
 * Persists the session to localStorage and auto-refreshes the access token, so
 * the user stays logged in across reloads, tab reopens, and multiple tabs.
 * An idle timeout (see AuthContext) signs the user out after a period of
 * inactivity so the session doesn't persist indefinitely.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
