import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/Layout";
import Home from "./components/Home.jsx";
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import DoctorApplyPage from "./components/auth/DoctorApplyPage";
import TermsPage from "./components/TermsPage";
import ServicesPage from "./components/ServicesPage";
import Dashboard from "./components/Dashboard";

/**
 * App shell: a single AuthProvider owns auth state for everything below it, and
 * the router exposes the public marketing home plus the auth pages. /dashboard
 * is wrapped in ProtectedRoute so logged-out users get bounced to /login.
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/apply-doctor" element={<DoctorApplyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/services" element={<ServicesPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
