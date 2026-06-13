import { useState } from "react";
import { Link } from "react-router-dom";
import HERO_BG from "../../assets/images/service_bg.png";
import { services } from "../lib/services";

/**
 * Public "Our Clinical Specialties" services page. Cards are data-driven from
 * src/data/services.json (id, image, title, shortDesc, longDesc). Six show
 * initially; "View More" reveals the rest. "Read More" opens /services/:id.
 * Navbar + Footer come from the shared Layout.
 */

const PAGE_SIZE = 6;

export default function ServicesPage() {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = services.slice(0, visible);
  const hasMore = visible < services.length;

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
            {shown.map((s) => (
              <div
                key={s.id}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,89,92,0.08)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    alt={s.title}
                    src={s.image}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h4 className="text-2xl font-bold mb-4 text-on-surface">{s.title}</h4>
                  <p className="text-on-surface-variant leading-relaxed mb-8 flex-grow">
                    {s.shortDesc}
                  </p>
                  <Link
                    to={`/services/${s.id}`}
                    className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-widest hover:gap-4 transition-all w-fit"
                  >
                    Read More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-16">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary px-8 py-3.5 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                View More
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
