import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LOGO from "../../../assets/images/logo.png";

const NAV_ITEMS = [
  { label: "Home", to: "/", end: true },
  { label: "Services", to: "/services" },
  { label: "Products", to: "/products" },
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

// Pull a friendly first name from the profile, falling back to the email local part.
function displayName(profile, user) {
  if (profile?.name) return profile.name.split(" ")[0];
  if (user?.email) return user.email.split("@")[0];
  return "there";
}

function avatarInitial(profile, user) {
  const source = profile?.name || user?.email || "?";
  return source.trim().charAt(0).toUpperCase();
}

// Shared avatar visual: the uploaded profile photo when present, else the initial.
function AvatarContent({ profile, user }) {
  const photoUrl = profile?.photoUrl ?? null;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Profile"
        className="h-full w-full rounded-full object-cover"
      />
    );
  }
  return avatarInitial(profile, user);
}

// Circular avatar that expands a dropdown with a greeting + Dashboard / Log Out.
function UserMenu({ profile, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-container text-on-primary font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <AvatarContent profile={profile} user={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-56 rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/20 py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-outline-variant/20">
            <p className="font-headline font-bold text-on-surface truncate">
              Hello, {displayName(profile, user)}!
            </p>
            {user?.email && (
              <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
            )}
          </div>
          <Link
            to="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            Dashboard
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { session, user, profile, loading, signOut } = useAuth();
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
            <UserMenu profile={profile} user={user} onLogout={handleLogout} />
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-container text-on-primary font-bold shrink-0">
                    <AvatarContent profile={profile} user={user} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-headline font-bold text-on-surface truncate">
                      Hello, {displayName(profile, user)}!
                    </p>
                    {user?.email && (
                      <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 font-body text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">dashboard</span>
                  Dashboard
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
