import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { createPatientProfile } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sign up with Supabase, then (if a session is returned immediately, i.e. email
 * confirmation is OFF) create the backend PATIENT profile via POST /auth/profile.
 *
 * If the project has "Confirm email" ON, signUp returns no session — we tell the
 * user to confirm their email; profile creation happens after they log in.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Session present => email confirmation is off, user is logged in now.
    if (data.session) {
      try {
        await createPatientProfile({ name });
        await refreshProfile();
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // No session => must confirm email first.
    setLoading(false);
    setNotice("Check your email to confirm your account, then log in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-700">{notice}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </Button>
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
