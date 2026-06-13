import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMe, type MeResponse } from "../lib/api";

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
      const { profile } = await getMe();
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
