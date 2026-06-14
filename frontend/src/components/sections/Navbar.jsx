import { useState } from "react";
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

// Mobile variant: full-width tappable rows instead of inline links.
const mobileNavClass = ({ isActive }) =>
  `block font-body text-sm tracking-wider py-2 transition-colors ${
    isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
  }`;

export default function Navbar() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  }

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
      <div className="flex justify-between items-center px-6 md:px-8 h-20 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img alt="Kinex Healthcare Logo" className="h-10 w-auto shrink-0" src={LOGO} />
          <span className="text-base sm:text-lg lg:text-xl font-headline font-bold tracking-tight text-primary truncate">
            Kinex Wellness & Rehab
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop auth actions */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? null : session ? (
            <>
              <Link
                to="/dashboard"
                className="hidden lg:inline font-body text-sm text-on-surface-variant hover:text-primary transition-colors"
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

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="md:hidden glass-nav border-t border-outline-variant/30 px-6 py-4">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={mobileNavClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
            {loading ? null : session ? (
              <>
                {user?.email && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="font-body text-sm text-on-surface-variant hover:text-primary transition-colors truncate"
                  >
                    {user.email}
                  </Link>
                )}
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
                  onClick={() => setMenuOpen(false)}
                  className="px-5 py-2.5 text-center font-body text-sm font-medium text-on-surface-variant hover:opacity-80 transition-opacity"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="bg-primary-container text-on-primary px-6 py-2.5 rounded-lg text-center font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
