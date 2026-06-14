import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { DOCTOR_APPLY_INTENT_KEY, type DoctorDetails } from "../../lib/api";
import GoogleButton from "./GoogleButton";
import TermsCheckbox from "./TermsCheckbox";
import CheckEmailNotice from "./CheckEmailNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

/**
 * "Apply as a Doctor" — same two paths as patient signup, but creates a DOCTOR
 * profile (status PENDING until an admin verifies).
 *
 * Both paths stash the doctor details in sessionStorage and defer profile
 * creation until the user is authenticated, at which point AuthContext reads the
 * stash and calls POST /doctor/apply:
 * - Email/password: supabase.auth.signUp() emails a confirmation link; the stash
 *   is consumed when the user returns via that link.
 * - Google: start OAuth; the stash is consumed on return.
 *
 * Existing doctors just use the normal /login.
 */
export default function DoctorApplyPage() {
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    licenseNumber: "",
    phone: "",
    email: "",
    password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Doctor details (no email/password) — used by both the email and Google paths. */
  function doctorDetails(): DoctorDetails {
    return {
      name: form.name,
      specialization: form.specialization,
      licenseNumber: form.licenseNumber,
      phone: form.phone || undefined,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms & Conditions to continue.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Stash the doctor details so AuthContext can create the DOCTOR profile
      // once the user confirms their email and returns authenticated.
      sessionStorage.setItem(
        DOCTOR_APPLY_INTENT_KEY,
        JSON.stringify(doctorDetails())
      );
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: form.name },
        },
      });
      if (signUpError) {
        sessionStorage.removeItem(DOCTOR_APPLY_INTENT_KEY);
        throw signUpError;
      }
      // Already-registered email: Supabase returns a user with no identities and
      // sends no mail (anti-enumeration). Don't show a dead "check email" screen.
      if (data.user && data.user.identities?.length === 0) {
        sessionStorage.removeItem(DOCTOR_APPLY_INTENT_KEY);
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

  // Runs right before the Google redirect: require the doctor fields and stash
  // them so we can finish the application when the user returns.
  function beforeGoogle(): boolean {
    if (!agreed) {
      setError("Please agree to the Terms & Conditions to continue.");
      return false;
    }
    if (!form.name || !form.specialization || !form.licenseNumber) {
      setError("Fill in name, specialization and license number before using Google.");
      return false;
    }
    sessionStorage.setItem(DOCTOR_APPLY_INTENT_KEY, JSON.stringify(doctorDetails()));
    return true;
  }

  if (sent) {
    return <CheckEmailNotice email={form.email} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 rounded-xl border shadow-sm bg-card"
      >
        <div>
          <h1 className="text-2xl font-bold text-primary">Apply as a Doctor</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Your application is reviewed before you can take appointments.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={form.name} onChange={set("name")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input id="specialization" required value={form.specialization} onChange={set("specialization")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="licenseNumber">License number</Label>
          <Input id="licenseNumber" required value={form.licenseNumber} onChange={set("licenseNumber")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={form.password}
              onChange={set("password")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

        </div>

        <TermsCheckbox checked={agreed} onChange={setAgreed} />
        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading || !agreed}>
          {loading ? "Submitting…" : "Submit application"}
        </Button>

        <GoogleButton beforeRedirect={beforeGoogle} />

        <p className="text-sm text-center text-on-surface-variant">
          Already a doctor?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
