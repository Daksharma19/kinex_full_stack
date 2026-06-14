import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Email OTP verification, shown right after supabase.auth.signUp() for both the
 * patient signup and the doctor-apply flows.
 *
 * The user types the 6-digit code from the confirmation email and verifyOtp
 * creates the session IN THIS TAB. Staying in the same tab is the whole point:
 * any pending doctor-apply intent (localStorage + user_metadata) is preserved,
 * unlike the old magic-link flow which opened a fresh tab and lost it — which is
 * why verified doctors were getting provisioned as patients.
 *
 * Requires the Supabase "Confirm signup" email template to include the code
 * token `{{ .Token }}` (Dashboard → Authentication → Email Templates).
 */
export default function VerifyOtpForm({ email }: { email: string }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "signup",
    });
    setVerifying(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Session is now set in this tab; AuthProvider's onAuthStateChange provisions
    // the profile — PATIENT, or DOCTOR if an apply intent is pending.
    navigate("/dashboard", { replace: true });
  }

  async function resend() {
    setResending(true);
    setMessage(null);
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) setError(error.message);
    else setMessage("A new code is on its way. Check your inbox.");
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card text-center"
      >
        <MailCheck className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold text-primary">Enter your code</h1>
        <p className="text-sm text-on-surface-variant">
          We sent a verification code to{" "}
          <span className="font-medium">{email}</span>. Enter it below to activate
          your account.
        </p>

        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={10}
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="text-center tracking-[0.4em] text-lg font-semibold"
          />
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* OTP length is configurable in Supabase (commonly 6–8 digits): allow up
            to 10 and let the server be the source of truth on the exact length. */}
        <Button type="submit" disabled={verifying || code.length < 6}>
          {verifying ? "Verifying…" : "Verify & continue"}
        </Button>
        <Button type="button" variant="outline" onClick={resend} disabled={resending}>
          {resending ? "Sending…" : "Resend code"}
        </Button>

        <p className="text-sm text-center text-on-surface-variant">
          Already verified?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
