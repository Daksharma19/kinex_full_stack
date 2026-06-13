import { useParams, Link } from "react-router-dom";
import { getServiceById } from "../lib/services";

/**
 * Service detail page (/services/:id). Looks the service up from services.json
 * and shows its image + long description. Chrome comes from the shared Layout.
 */
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const service = id ? getServiceById(id) : undefined;

  if (!service) {
    return (
      <div className="flex-1 w-full bg-background px-6 py-24 max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-on-surface mb-3">Service not found</h1>
        <p className="text-on-surface-variant mb-8">
          We couldn't find the service you're looking for.
        </p>
        <Link to="/services" className="text-primary font-bold underline">
          ← Back to all services
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background text-on-surface">
      {/* Banner */}
      <header className="relative h-72 md:h-96 overflow-hidden">
        <img alt={service.title} src={service.image} className="w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 z-10 max-w-5xl mx-auto px-8 flex flex-col justify-end pb-10">
          <Link
            to="/services"
            className="text-white/80 hover:text-white text-sm font-medium mb-4 inline-flex items-center gap-1 w-fit"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> All services
          </Link>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            {service.title}
          </h1>
        </div>
      </header>

      {/* Body */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-8">
          <p className="text-xl text-on-surface-variant leading-relaxed font-light mb-8">
            {service.shortDesc}
          </p>
          <div className="prose prose-lg max-w-none">
            <p className="text-on-surface leading-relaxed text-lg">{service.longDesc}</p>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary px-8 py-4 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Book an Appointment
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border border-outline-variant/40 text-on-surface px-8 py-4 rounded-lg font-bold hover:bg-surface-container-low transition-all"
            >
              Explore other services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
