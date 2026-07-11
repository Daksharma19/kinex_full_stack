import { Link } from "react-router-dom";
import LOGO from "../../../assets/images/logo.png";
// Each link points to a real in-app route.
const COLUMNS = [
  {
    title: "Services",
    links: [
      { label: "Physical Therapy", to: "/services" },
      { label: "Neurology", to: "/services" },
      { label: "Pain Management", to: "/services" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Patient Rights", to: "/privacy" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Provider Portal", to: "/apply-doctor" },
      { label: "Contact Support", to: "/contact" },
      { label: "Help Center", to: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full py-16 px-6 md:px-8 mt-auto bg-surface-container-low border-t-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <img alt="Physiotic Logo" className="h-8 w-auto" src={LOGO} />
            <span className="font-headline font-bold text-lg text-primary">
              Physiotic
            </span>
          </div>
          <p className="font-body text-primary text-sm font-medium italic mb-3">
            Precision in all recoveries
          </p>
          <p className="font-body text-on-surface-variant text-sm mb-3">
            Are you a healthcare provider?
          </p>
          <Link
            to="/apply-doctor"
            className="inline-block bg-primary-container text-on-primary px-5 py-2.5 rounded-lg font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            Apply as a Doctor
          </Link>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h6 className="font-bold text-on-surface mb-6">{col.title}</h6>
            <ul className="space-y-4">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    className="font-body text-on-surface-variant text-sm hover:text-primary transition-colors"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-outline-variant text-center">
        <p className="font-body text-on-surface-variant text-sm">
          © Physiotic. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
