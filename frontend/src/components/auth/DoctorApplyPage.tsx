import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  signUpDoctor,
  DOCTOR_APPLY_INTENT_KEY,
  type DoctorDetails,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import GoogleButton from "./GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Apply as a Doctor" — same two paths as patient signup, but creates a DOCTOR
 * profile (status PENDING until an admin verifies).
 *
 * - Email/password: POST /doctor/signup, then sign in for a session.
 * - Google: stash the doctor details in sessionStorage and start OAuth; when the
 *   user returns, AuthContext reads the stash and calls POST /doctor/apply.
 *
 * Existing doctors just use the normal /login.
 */
export default function DoctorApplyPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    licenseNumber: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setError(null);
    setLoading(true);
    try {
      await signUpDoctor({
        ...doctorDetails(),
        email: form.email,
        password: form.password,
      });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) throw signInError;
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Runs right before the Google redirect: require the doctor fields and stash
  // them so we can finish the application when the user returns.
  function beforeGoogle(): boolean {
    if (!form.name || !form.specialization || !form.licenseNumber) {
      setError("Fill in name, specialization and license number before using Google.");
      return false;
    }
    sessionStorage.setItem(DOCTOR_APPLY_INTENT_KEY, JSON.stringify(doctorDetails()));
    return true;
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
          <Input id="password" type="password" required minLength={6} value={form.password} onChange={set("password")} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading}>
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
