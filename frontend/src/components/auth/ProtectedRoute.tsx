import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

/**
 * Gate for authenticated-only routes. While the initial session check is in
 * flight we render nothing (avoids a flash of the login page for already
 * logged-in users). If there's no session, redirect to /login and remember
 * where the user was headed so we can send them back after login.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
