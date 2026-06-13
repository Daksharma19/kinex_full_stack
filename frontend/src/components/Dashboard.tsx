import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Example protected page. Only reachable through <ProtectedRoute>, so a session
 * is guaranteed here. Reads identity from the shared auth context and shows the
 * backend profile (which may still be null if the user hasn't onboarded).
 */
export default function Dashboard() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <Button variant="secondary" onClick={() => signOut()}>
          Log out
        </Button>
      </div>

      <div className="rounded-xl border p-6 bg-card flex flex-col gap-2">
        <p className="text-sm text-on-surface-variant">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
        {profile ? (
          <p className="text-sm">
            Profile: <span className="font-medium">{profile.name}</span> ·{" "}
            <span className="uppercase">{profile.role}</span>
          </p>
        ) : (
          <p className="text-sm text-amber-700">
            You're authenticated but have no app profile yet. Complete onboarding to
            book appointments.
          </p>
        )}
      </div>

      <Link to="/" className="text-primary underline text-sm">
        ← Back to home
      </Link>
    </div>
  );
}
