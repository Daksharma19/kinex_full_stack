import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LOGO from "../../../assets/images/logo.png";

const NAV_ITEMS = [
  { label: "Home", to: "/", end: true },
  { label: "Services", to: "/services" },
  { label: "Contact Us", to: "/contact" },
];

// Highlight the link for the page we're currently on.
const navClass = ({ isActive }) =>
  `font-body text-sm tracking-wider pb-1 transition-colors ${
    isActive
      ? "text-primary font-bold border-b-2 border-primary"
      : "text-on-surface-variant hover:text-primary"
  }`;

export default function Navbar() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
      <div className="flex justify-between items-center px-6 md:px-8 h-20 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <img alt="Kinex Healthcare Logo" className="h-10 w-auto" src={LOGO} />
          <span className="text-xl font-headline font-bold tracking-tight text-primary">
            Kinex Wellness & Rehab
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {loading ? null : session ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline font-body text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                {user?.email}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-primary-container text-on-primary px-6 py-2.5 rounded-lg font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2.5 font-body text-sm font-medium text-on-surface-variant hover:opacity-80 transition-opacity"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-primary-container text-on-primary px-6 py-2.5 rounded-lg font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
