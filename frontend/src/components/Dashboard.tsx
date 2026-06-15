import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import DoctorDashboard from "./DoctorDashboard";
import PatientDashboard from "./PatientDashboard";
import Loader from "./Loader";

/**
 * Protected landing page. Only reachable through <ProtectedRoute>, so a session
 * is guaranteed here. Renders the right console for the user's role.
 */
export default function Dashboard() {
  const { user, profile, profileLoading } = useAuth();

  if (profile?.role === "ADMIN") return <AdminDashboard />;
  if (profile?.role === "DOCTOR") return <DoctorDashboard />;
  if (profile?.role === "PATIENT") return <PatientDashboard />;

  // Profile is still being fetched/provisioned — show the branded loader instead
  // of briefly flashing the "no profile" message below.
  if (profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader label="Loading your dashboard…" />
      </div>
    );
  }

  // Authenticated but no app profile yet (e.g. mid-onboarding).
  return (
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-3xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
      <div className="rounded-xl border p-6 bg-card flex flex-col gap-2">
        <p className="text-sm text-on-surface-variant">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
        <p className="text-sm text-amber-700">
          You're authenticated but have no app profile yet. Complete onboarding to
          book appointments.
        </p>
      </div>
    </div>
  );
}
