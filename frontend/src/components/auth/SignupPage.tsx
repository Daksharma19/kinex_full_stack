import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleButton from "./GoogleButton";
import TermsCheckbox from "./TermsCheckbox";
import VerifyOtpForm from "./VerifyOtpForm";
import PasswordChecklist from "@/components/ui/PasswordChecklist";
import { isStrongPassword, isValidEmail, sanitizeText } from "@/lib/validation";
import { Eye, EyeOff } from "lucide-react";

/**
 * Patient signup via Supabase's native email confirmation flow, verified with a
 * 6-digit OTP code (not a magic link).
 *
 * We call supabase.auth.signUp(), so Supabase emails a confirmation code. No
 * session exists until the user enters it on VerifyOtpForm (same tab). The full
 * name is passed in options.data; AuthContext reads it from user_metadata to
 * provision the PATIENT profile on first authenticated load — the same
 * deferred-provisioning path Google sign-in already uses.
 */
export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms & Conditions to continue.");
      return;
    }
    const cleanName = sanitizeText(name);
    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Please choose a password that meets all the requirements below.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: cleanName },
        },
      });
      if (signUpError) throw signUpError;
      // Supabase doesn't error on an already-registered email (anti-enumeration);
      // it returns a user with an empty `identities` array and sends no mail.
      // Detect that and steer the user to log in instead of a dead "check email".
      if (data.user && data.user.identities?.length === 0) {
        setError("An account with this email already exists - please log in.");
        return;
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <VerifyOtpForm email={email} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card"
      >
        <h1 className="text-2xl font-bold text-primary">Sign up</h1>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
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
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordChecklist password={password} />
        </div>
        <TermsCheckbox checked={agreed} onChange={setAgreed} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading || !agreed}>
          {loading ? "Creating account…" : "Sign up"}
        </Button>
        <GoogleButton
          beforeRedirect={() => {
            if (!agreed) {
              setError("Please agree to the Terms & Conditions to continue.");
              return false;
            }
            return true;
          }}
        />
        <p className="text-sm text-center text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
