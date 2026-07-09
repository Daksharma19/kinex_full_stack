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

// Auto-logout after this much inactivity. Shared across tabs via localStorage,
// so activity in any tab keeps every tab's session alive.
const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const LAST_ACTIVITY_KEY = "kinex.lastActivity";

const readLastActivity = () => Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
const markActivity = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
const clearActivity = () => localStorage.removeItem(LAST_ACTIVITY_KEY);

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
    // Enforce the idle timeout for a persisted (restored) session: if it has a
    // recorded activity timestamp that's older than the limit, sign out instead
    // of silently restoring it. This is what stops a session left open yesterday
    // from logging the next person in. Returns true if it signed out.
    //
    // We only expire a KNOWN-stale session. A session with no recorded activity
    // yet must NOT be signed out here — that's exactly the case for a fresh
    // OAuth (Google) login, which returns via a full page load and surfaces as
    // INITIAL_SESSION before markActivity() has run. Signing it out here was
    // bouncing every Google sign-in straight back to /login. The [session] effect
    // below marks activity once the session is accepted, so tracking still starts.
    async function enforceIdleTimeout(current: Session | null): Promise<boolean> {
      if (!current) return false;
      const last = readLastActivity();
      if (last && Date.now() - last > IDLE_LIMIT_MS) {
        clearActivity();
        await supabase.auth.signOut(); // fires SIGNED_OUT, which clears state
        return true;
      }
      return false;
    }

    // Detect an in-progress OAuth / magic-link callback at load. On such returns
    // the URL carries a `code` (PKCE) or `#access_token` (implicit) that the
    // client exchanges into a session via a LATER SIGNED_IN event — the initial
    // INITIAL_SESSION fires with null first. We must NOT report "no session"
    // during that window, or ProtectedRoute bounces to /login before the session
    // lands (Google sign-in appeared to "do nothing" even though the user was
    // created). While a callback is pending we keep loading=true until a session
    // arrives, with a safety timeout so a failed callback can't hang the UI.
    const isAuthCallback =
      new URLSearchParams(window.location.search).has("code") ||
      /[#&](access_token|refresh_token)=/.test(window.location.hash);
    let awaitingCallbackSession = isAuthCallback;
    const callbackSafety = isAuthCallback
      ? setTimeout(() => {
          awaitingCallbackSession = false;
          setLoading(false);
        }, 5000)
      : null;

    // Single source of truth for auth: onAuthStateChange fires INITIAL_SESSION on
    // subscribe (hydrating any persisted session), plus every later login/logout/
    // token-refresh. Handling them all here avoids the getSession-vs-event race
    // that previously let an idle persisted session slip past the timeout check.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // A fresh interactive login starts a new activity window.
      if (event === "SIGNED_IN") markActivity();
      if (event === "SIGNED_OUT") clearActivity();

      // A restored session on first load must pass the idle check before we accept
      // it. If it fails, signOut() emits SIGNED_OUT which drives the real cleanup.
      if (event === "INITIAL_SESSION" && (await enforceIdleTimeout(session))) {
        awaitingCallbackSession = false;
        setLoading(false);
        return;
      }

      setSession(session);
      // Unblock the UI as soon as the session is known — do NOT wait on the backend
      // profile fetch, which can be slow on a cold backend and was leaving the
      // navbar blank meanwhile. The navbar only needs the session to decide what to
      // show; name/photo fill in when the profile arrives (tracked by profileLoading).
      // Exception: during an OAuth callback keep loading until the session actually
      // arrives, so we don't flash a redirect to /login on the interim null event.
      if (session) awaitingCallbackSession = false;
      if (!awaitingCallbackSession) setLoading(false);
      void loadProfile(session);
    });

    return () => {
      subscription.unsubscribe();
      if (callbackSafety) clearTimeout(callbackSafety);
    };
  }, []);

  // While logged in, track activity and enforce the idle timeout.
  useEffect(() => {
    if (!session) return;
    markActivity();

    let lastStamp = Date.now();
    const onActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once per 30s.
      if (now - lastStamp > 30_000) {
        lastStamp = now;
        markActivity();
      }
    };
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = readLastActivity();
      if (last && Date.now() - last > IDLE_LIMIT_MS) {
        clearActivity();
        void supabase.auth.signOut(); // propagates to all tabs via onAuthStateChange
      }
    }, 60_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [session]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    signOut: async () => {
      clearActivity();
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
