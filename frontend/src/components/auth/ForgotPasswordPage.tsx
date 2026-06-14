import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Step 1 of password reset: the user enters their email and we ask Supabase to
 * send a recovery link (supabase.auth.resetPasswordForEmail). The link points
 * back at /reset-password, where the user sets a new password.
 *
 * For security (anti-enumeration) Supabase does not reveal whether the email is
 * registered, so we always show the same "check your email" confirmation.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card text-center">
          <MailCheck className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-primary">Check your email</h1>
          <p className="text-sm text-on-surface-variant">
            If an account exists for <span className="font-medium">{email}</span>,
            we sent a link to reset your password. Open it to choose a new one.
          </p>
          <p className="text-sm text-center text-on-surface-variant">
            <Link to="/login" className="text-primary underline">
              Back to log in
            </Link>
          </p>
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
        <h1 className="text-2xl font-bold text-primary">Forgot password</h1>
        <p className="text-sm text-on-surface-variant">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-sm text-center text-on-surface-variant">
          Remembered it?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
