import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  getMe,
  createPatientProfile,
  applyDoctor,
  DOCTOR_APPLY_INTENT_KEY,
  type DoctorDetails,
  type MeResponse,
} from "../lib/api";

interface AuthContextValue {
  /** Supabase session (null when logged out). */
  session: Session | null;
  /** Supabase auth user (identity). null when logged out. */
  user: User | null;
  /** App profile from the backend (null when logged out OR not onboarded yet). */
  profile: MeResponse["profile"];
  /** True until the initial session lookup resolves — gate redirects on this. */
  loading: boolean;
  /** True while the backend profile is being fetched/provisioned for a session. */
  profileLoading: boolean;
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
  // Number of in-flight profile fetches. A counter (not a boolean) so that
  // concurrent loads — e.g. React StrictMode double-invoking effects, or a
  // getSession() and an onAuthStateChange firing together — don't let an early
  // finisher clear the loading flag while another fetch is still running.
  const [pendingProfileLoads, setPendingProfileLoads] = useState(0);
  const profileLoading = pendingProfileLoads > 0;

  async function loadProfile(currentSession: Session | null) {
    if (!currentSession) {
      setProfile(null);
      return;
    }
    setPendingProfileLoads((n) => n + 1);
    try {
      let { profile } = await getMe();

      // First-time OAuth (Google) users have a valid session but no app profile
      // yet. Provision one now so the dashboard and protected API calls work.
      // Email/password users already get a profile at signup, so this only fires
      // for OAuth.
      if (!profile) {
        try {
          // If the user came through "Apply as a Doctor", the form details were
          // stashed before signup — create a DOCTOR profile. We check both
          // localStorage (same browser) and user_metadata (survives across
          // devices/browsers), so the doctor is never mis-provisioned as a
          // patient regardless of where they entered the verification code.
          const intentRaw = localStorage.getItem(DOCTOR_APPLY_INTENT_KEY);
          const metaApplication =
            currentSession.user.user_metadata?.doctor_application;
          if (intentRaw || metaApplication) {
            localStorage.removeItem(DOCTOR_APPLY_INTENT_KEY);
            const details = (
              intentRaw ? JSON.parse(intentRaw) : metaApplication
            ) as DoctorDetails;
            await applyDoctor(details);
          } else {
            // Default: a regular Google sign-in => PATIENT profile from identity.
            const u = currentSession.user;
            const name =
              (u.user_metadata?.full_name as string) ||
              (u.user_metadata?.name as string) ||
              u.email ||
              "New User";
            await createPatientProfile({ name });
          }
        } catch {
          // 409 (already created by a concurrent event) or transient error —
          // fall through and re-read the freshest profile below.
        }
        profile = (await getMe()).profile;
      }

      setProfile(profile);
    } catch {
      // Network/backend error — leave profile null; protected UI can retry.
      setProfile(null);
    } finally {
      setPendingProfileLoads((n) => n - 1);
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
    profileLoading,
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
