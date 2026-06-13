import { Link } from "react-router-dom";
import LOGO from "../../../assets/images/logo.png";
const COLUMNS = [
  {
    title: "Services",
    links: ["Physical Therapy", "Neurology", "Pain Management"],
  },
  {
    title: "Company",
    links: ["Privacy Policy", "Terms of Service", "Patient Rights"],
  },
  {
    title: "Support",
    links: ["Provider Portal", "Contact Support", "Help Center"],
  },
];

export default function Footer() {
  return (
    <footer className="w-full py-16 px-6 md:px-8 mt-auto bg-surface-container-low border-t-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <img alt="Kinex Logo" className="h-8 w-auto" src={LOGO} />
            <span className="font-headline font-bold text-lg text-primary">
              Kinex Wellness & Rehab
            </span>
          </div>
          <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
            © Kinex Wellness & Rehab.
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
                <li key={link}>
                  <a
                    className="font-body text-on-surface-variant text-sm hover:text-primary transition-colors"
                    href="#"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
