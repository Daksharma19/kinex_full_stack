import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * Shown after a native supabase.auth.signUp() that requires email confirmation.
 * Tells the user to check their inbox and lets them resend the confirmation
 * link (e.g. if it didn't arrive or expired).
 */
export default function CheckEmailNotice({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setResending(true);
    setMessage(null);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setResending(false);
    if (error) setError(error.message);
    else setMessage("Confirmation email sent. Check your inbox.");
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card text-center">
        <MailCheck className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold text-primary">Check your email</h1>
        <p className="text-sm text-on-surface-variant">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Click it to activate your account, then log in.
        </p>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button variant="outline" onClick={resend} disabled={resending}>
          {resending ? "Sending…" : "Resend confirmation email"}
        </Button>
        <p className="text-sm text-center text-on-surface-variant">
          Already confirmed?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
