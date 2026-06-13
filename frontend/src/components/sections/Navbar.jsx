import LOGO from "../../../assets/images/logo.png";
export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
      <div className="flex justify-between items-center px-6 md:px-8 h-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img alt="Kinex Healthcare Logo" className="h-10 w-auto" src={LOGO} />
          <span className="text-xl font-headline font-bold tracking-tight text-primary">
            Kinex Wellness & Rehab
          </span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <a
            className="font-body text-sm tracking-wider text-primary border-b-2 border-primary pb-1"
            href="#"
          >
            Platform
          </a>
          <a
            className="font-body text-sm tracking-wider text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Services
          </a>
          <a
            className="font-body text-sm tracking-wider text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Contact Us
          </a>
          <a
            className="font-body text-sm tracking-wider text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Blogs
          </a>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-5 py-2.5 font-body text-sm font-medium text-on-surface-variant hover:opacity-80 transition-opacity">
            Log In
          </button>
          <button className="bg-primary-container text-on-primary px-6 py-2.5 rounded-lg font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all">
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}
