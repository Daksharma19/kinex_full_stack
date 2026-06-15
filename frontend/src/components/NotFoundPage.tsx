import { Link } from "react-router-dom";

/**
 * 404 page rendered for any unmatched URL (catch-all route in App.tsx).
 * Chrome (navbar/footer) comes from the shared Layout.
 */
export default function NotFoundPage() {
  return (
    <div className="flex-1 w-full bg-background px-6 py-20">
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        <p className="text-7xl sm:text-8xl font-extrabold text-primary tracking-tight">
          404
        </p>
        <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-on-surface">
          Page not found!
        </h1>
        <p className="mt-3 text-on-surface-variant">
          The page you are looking for does not exist.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/20"
        >
          Take me to homepage
        </Link>
      </div>
    </div>
  );
}
