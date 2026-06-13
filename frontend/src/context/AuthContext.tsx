import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMe, createPatientProfile, type MeResponse } from "../lib/api";

interface AuthContextValue {
  /** Supabase session (null when logged out). */
  session: Session | null;
  /** Supabase auth user (identity). null when logged out. */
  user: User | null;
  /** App profile from the backend (null when logged out OR not onboarded yet). */
  profile: MeResponse["profile"];
  /** True until the initial session lookup resolves — gate redirects on this. */
  loading: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch the backend profile (e.g. right after creating it). */
  refreshProfile: () => Promise<void>;
  /** Start the Google OAuth redirect flow via Supabase. */
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Single owner of auth state for the whole frontend. Wraps the app once (see
 * App.tsx). Subscribes to the shared supabase client's auth changes so login,
 * logout, token refresh and cross-tab changes all flow through here — there is
 * no second source of truth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MeResponse["profile"]>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentSession: Session | null) {
    if (!currentSession) {
      setProfile(null);
      return;
    }
    try {
      let { profile } = await getMe();

      // First-time OAuth (Google) users have a valid session but no app profile
      // yet. Auto-provision a PATIENT profile from their Google identity so the
      // dashboard and protected API calls work immediately. Email/password users
      // already get a profile at signup, so this only fires for OAuth.
      if (!profile) {
        const u = currentSession.user;
        const name =
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          u.email ||
          "New User";
        try {
          await createPatientProfile({ name });
          profile = (await getMe()).profile;
        } catch {
          // 409 (already created by a concurrent event) or transient error —
          // re-read so we still land on the freshest profile.
          profile = (await getMe()).profile;
        }
      }

      setProfile(profile);
    } catch {
      // Network/backend error — leave profile null; protected UI can retry.
      setProfile(null);
    }
  }

  useEffect(() => {
    // 1. Hydrate from any persisted session on first load.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await loadProfile(session);
      setLoading(false);
    });

    // 2. Keep in sync with all future auth events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await loadProfile(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: () => loadProfile(session),
    signInWithGoogle: async () => {
      // Redirect back to /dashboard after Google auth. detectSessionInUrl on the
      // shared client consumes the callback and fires onAuthStateChange.
      // NOTE: this URL must be allow-listed in Supabase → Authentication → URL
      // Configuration → Redirect URLs (e.g. http://localhost:5173/dashboard).
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
