import { Link } from "react-router-dom";
import HERO_BG from "../../assets/images/service_bg.png";
import SANCTUARY_IMG from "../../assets/images/doctor.png";

/**
 * Public "Our Clinical Specialties" services page, styled after the Kinex
 * mockup. Navbar + Footer come from the shared Layout, so this renders only the
 * page sections. Service cards use Material Symbols icons (already loaded) rather
 * than remote images to stay self-contained.
 */

const SERVICES = [
  {
    icon: "cardiology",
    title: "Advanced Cardiology",
    desc: "Heart care reimagined through robotic diagnostics and minimally invasive preventive interventions.",
  },
  {
    icon: "exercise",
    title: "Precision Physiotherapy",
    desc: "AI-assisted motion analysis to create hyper-personalized recovery programs for peak performance.",
  },
  {
    icon: "dentistry",
    title: "Dental & Oral Health",
    desc: "Painless dentistry in a spa-like environment, from cosmetic restoration to surgical implants.",
  },
  {
    icon: "surgical",
    title: "General Surgery",
    desc: "State-of-the-art surgical suites optimized for safety and rapid post-operative recovery.",
  },
  {
    icon: "child_care",
    title: "Pediatrics Care",
    desc: "Child-centric specialized care designed to make medical visits an engaging, stress-free experience.",
  },
  {
    icon: "neurology",
    title: "Neurology Services",
    desc: "Expert management of complex neurological conditions with focus on cognitive longevity.",
  },
];

const SANCTUARY_FEATURES = [
  {
    icon: "timer",
    title: "Reduced Wait Times",
    desc: "Our digital triage system ensures you move from arrival to consultation in under 8 minutes.",
  },
  {
    icon: "bedroom_parent",
    title: "Private Recovery Suites",
    desc: "Sound-proofed, private environments with circadian lighting and HEPA-pure air filtration.",
  },
  {
    icon: "description",
    title: "Instant Digital Reports",
    desc: "Receive encrypted diagnostic results directly to your Kinex app as soon as they are processed.",
  },
];

export default function ServicesPage() {
  return (
    <div className="flex-1 w-full bg-background text-on-surface">
      {/* Hero */}
      <header className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img alt="Clinical Sanctuary" className="w-full h-full object-cover" src={HERO_BG} />
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-none">
              Our Clinical <br />
              <span className="text-primary-fixed">Specialties</span>
            </h1>
            <p className="text-xl text-white/80 leading-relaxed mb-10 max-w-2xl font-light">
              Step into a Sanctuary of Healing. We combine cutting-edge precision
              technology with a calming environment designed to reduce clinical
              anxiety and prioritize your recovery journey.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Book Clinic Appointment
            </Link>
          </div>
        </div>
      </header>

      {/* Services grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <h2 className="text-xs tracking-widest uppercase text-primary font-bold mb-4">
                The Kinex Portfolio
              </h2>
              <h3 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">
                Integrated Specialized Care
              </h3>
            </div>
            <p className="text-on-surface-variant max-w-md text-lg leading-relaxed">
              Our multidisciplinary approach ensures that every aspect of your health
              is managed by leading experts using the latest protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,89,92,0.08)]"
              >
                <div className="relative h-44 overflow-hidden bg-primary-container/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-7xl transition-transform duration-500 group-hover:scale-110">
                    {s.icon}
                  </span>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h4 className="text-2xl font-bold mb-4 text-on-surface">{s.title}</h4>
                  <p className="text-on-surface-variant leading-relaxed mb-8 flex-grow">
                    {s.desc}
                  </p>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-widest hover:gap-4 transition-all"
                  >
                    Read More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
