import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { signUpPatient } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleButton from "./GoogleButton";
import TermsCheckbox from "./TermsCheckbox";

/**
 * Sign up via the backend (POST /auth/signup), which creates the auth user with
 * email pre-confirmed AND the PATIENT profile. We then sign in with the same
 * credentials to obtain a session, and AuthProvider picks it up. No email
 * confirmation step — works regardless of the project's email settings.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms & Conditions to continue.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Backend creates the pre-confirmed auth user + patient profile.
      await signUpPatient({ email, password, name });

      // 2. Sign in to get a session on the shared client.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // 3. Load the freshly created profile and go to the dashboard.
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
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
