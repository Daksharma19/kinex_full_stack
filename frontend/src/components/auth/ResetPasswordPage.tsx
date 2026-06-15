import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordChecklist from "@/components/ui/PasswordChecklist";
import { isStrongPassword } from "@/lib/validation";

/**
 * Step 2 of password reset: the user arrives here from the recovery link. The
 * shared supabase client (detectSessionInUrl) consumes the token in the URL and
 * establishes a temporary recovery session, firing a PASSWORD_RECOVERY event.
 * Once that session exists we let the user set a new password (entered twice to
 * guard against typos) via supabase.auth.updateUser({ password }).
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Wait for the recovery session created from the link's token. We both check
  // any session already established and listen for the PASSWORD_RECOVERY event,
  // since detectSessionInUrl resolves asynchronously.
  useEffect(() => {
    let settled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true;
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setReady(true);
      }
    });

    // If no recovery session shows up shortly, the link is missing/expired.
    const timer = setTimeout(() => {
      if (!settled) setLinkInvalid(true);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) {
      setError("Please choose a password that meets all the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    // Sign out the temporary recovery session so the user logs in fresh with
    // their new password.
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 1500);
  }

  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card text-center">
          <h1 className="text-2xl font-bold text-primary">Password updated</h1>
          <p className="text-sm text-on-surface-variant">
            Your password has been changed. Redirecting you to log in…
          </p>
          <Link to="/login" className="text-primary underline text-sm">
            Log in now
          </Link>
        </div>
      </div>
    );
  }

  if (linkInvalid && !ready) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card text-center">
          <h1 className="text-2xl font-bold text-primary">Link expired</h1>
          <p className="text-sm text-on-surface-variant">
            This password reset link is invalid or has expired. Request a new one.
          </p>
          <Link to="/forgot-password" className="text-primary underline text-sm">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card"
      >
        <h1 className="text-2xl font-bold text-primary">Set a new password</h1>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordChecklist password={password} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading || !ready}>
          {loading ? "Updating…" : ready ? "Update password" : "Verifying link…"}
        </Button>
      </form>
    </div>
  );
}
