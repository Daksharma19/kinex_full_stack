import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getSignInMethods } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleButton from "./GoogleButton";

/**
 * Email/password login. Identity is owned by Supabase — on success the shared
 * client stores the session and AuthProvider's onAuthStateChange picks it up.
 * We just navigate the user onward (back to where they came from, or home).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // True when login failed because the email hasn't been confirmed yet — lets us
  // offer a "resend confirmation" action.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Supabase returns "Email not confirmed" (code email_not_confirmed) when
      // confirmation is required but the link hasn't been clicked.
      const code = (error as { code?: string }).code;
      if (code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
        setUnconfirmed(true);
        setError("Please confirm your email before logging in.");
      } else {
        // Invalid credentials — but if this email is actually a social (Google)
        // account with no password, nudge them to the right method instead of the
        // confusing "invalid credentials".
        setError(await providerMismatchMessage(email, error.message));
      }
      return;
    }
    navigate(from, { replace: true });
  }

  // After a failed password login, ask the backend which providers this email is
  // registered with. If it's a social-only account (e.g. Google, no password),
  // return a helpful message; otherwise fall back to the original error.
  async function providerMismatchMessage(
    email: string,
    fallback: string
  ): Promise<string> {
    const PRETTY: Record<string, string> = {
      google: "Google",
      github: "GitHub",
      azure: "Microsoft",
    };
    try {
      const { providers } = await getSignInMethods(email);
      const hasPassword = providers.includes("email");
      const social = providers.filter((p) => p !== "email");
      if (!hasPassword && social.length > 0) {
        const names = social.map((p) => PRETTY[p] ?? p).join(" / ");
        return `This account was created with ${names}. Please use “Continue with ${names}” to sign in.`;
      }
    } catch {
      /* lookup failed — fall through to the generic error */
    }
    return fallback;
  }

  async function resendConfirmation() {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    else setNotice("Confirmation email sent. Check your inbox.");
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card"
      >
        <h1 className="text-2xl font-bold text-primary">Log in</h1>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-primary underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}
        {unconfirmed && (
          <button
            type="button"
            onClick={resendConfirmation}
            className="text-sm text-primary underline self-start"
          >
            Resend confirmation email
          </button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
        <GoogleButton />
        <p className="text-sm text-center text-on-surface-variant">
          No account?{" "}
          <Link to="/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
