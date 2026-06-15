import { useState } from "react";
import { Link } from "react-router-dom";
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
      {/* Page heading */}
      <header className="max-w-7xl mx-auto px-8 pt-16 md:pt-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-on-surface">
          Our Services
        </h1>
      </header>

      {/* Services grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shown.map((s) => (
              <div
                key={s.id}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,89,92,0.08)]"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    alt={s.title}
                    src={s.image}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold mb-3 text-on-surface">{s.title}</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6 flex-grow">
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
