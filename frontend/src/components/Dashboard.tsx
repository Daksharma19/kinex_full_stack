import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import DoctorDashboard from "./DoctorDashboard";
import PatientDashboard from "./PatientDashboard";
import Loader from "./Loader";
import DOCTOR_APOLOGY from "../../assets/images/doctor-apology.svg";

/**
 * Protected landing page. Only reachable through <ProtectedRoute>, so a session
 * is guaranteed here. Renders the right console for the user's role.
 */
export default function Dashboard() {
  const { profile, profileLoading } = useAuth();

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
    <div className="flex-1 w-full bg-background px-6 py-10 max-w-3xl mx-auto flex flex-col items-center justify-center text-center gap-6">
      <img
        src={DOCTOR_APOLOGY}
        alt="Apologetic doctor holding a notepad"
        className="w-48 h-48 md:w-56 md:h-56"
      />
      <p className="text-lg font-medium text-on-surface">
        Sorry for Inconvenience, Please Come Back Later
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold shadow-sm hover:opacity-90 transition-all active:scale-95"
      >
        Back to Home Page
      </Link>
    </div>
  );
}
