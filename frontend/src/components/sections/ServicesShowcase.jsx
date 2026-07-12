import { Link } from "react-router-dom";
import { getServiceById, getServiceImage } from "../../lib/services";
import MANUAL_THERAPY from "../../../assets/images/serv/MT.png";

/**
 * Short bento-grid services showcase for the Home page (shown after ChooseUs).
 * Data-driven from src/data/services.json — each card links to /services/:id,
 * and the section CTA goes to the full /services page.
 */

const manual = getServiceById(1);
const sports = getServiceById(2);
const ortho = getServiceById(3);
const neuro = getServiceById(4);
const pediatric = getServiceById(6);
const needling = getServiceById(10);

export default function ServicesShowcase() {
  return (
    <section className="pt-0 pb-14 md:pb-20 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-6 md:mb-8 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-headline font-bold tracking-tight text-primary mb-4">
            Care for Every Recovery
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            From hands-on therapy to specialized rehabilitation, explore the
            treatments our clinicians tailor to your recovery path.
          </p>
        </div>

        {/* Asymmetrical bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(130px,auto)] gap-4 md:gap-5">
          {/* Manual Therapy — large portrait image card */}
          <Link
            to={`/services/${manual.id}`}
            className="bento-card col-span-1 md:col-span-4 md:row-span-3 min-h-[320px] rounded-2xl overflow-hidden relative group"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${MANUAL_THERAPY}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
            <div className="absolute bottom-0 p-6 w-full">
              <span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed text-xs font-bold rounded-full mb-3 uppercase tracking-widest">
                Therapy
              </span>
              <h3 className="text-2xl font-headline font-bold text-white mb-2">
                {manual.title}
              </h3>
              <p className="text-on-primary-container text-sm mb-4 leading-relaxed opacity-90">
                {manual.shortDesc}
              </p>
              <span className="inline-flex items-center text-white font-medium group-hover:gap-2 transition-all">
                Learn More
                <span className="material-symbols-outlined ml-1 text-sm">
                  arrow_forward
                </span>
              </span>
            </div>
          </Link>

          {/* Sports Rehabilitation — wide tonal card with image */}
          <Link
            to={`/services/${sports.id}`}
            className="bento-card col-span-1 md:col-span-8 bg-primary-container rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="md:w-3/5">
              <h3 className="text-2xl font-headline font-bold text-white mb-2">
                {sports.title}
              </h3>
              <p className="text-white/80 leading-relaxed mb-3">
                {sports.shortDesc}
              </p>
              <span className="text-white font-bold underline underline-offset-4 hover:text-primary-fixed transition-colors">
                Explore Sports Rehab
              </span>
            </div>
            <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-full overflow-hidden border-4 border-white/20">
              <img
                alt={sports.title}
                src={getServiceImage(sports.id)}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>

          {/* Neuro Rehabilitation — standard tonal card */}
          <Link
            to={`/services/${neuro.id}`}
            className="bento-card col-span-1 md:col-span-4 bg-surface-container-low rounded-2xl p-6 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-3xl mb-3">
              psychology
            </span>
            <h3 className="text-xl font-headline font-bold text-on-surface mb-2">
              {neuro.title}
            </h3>
            <p className="text-on-surface-variant text-sm mb-3 leading-relaxed">
              {neuro.shortDesc}
            </p>
            <span className="text-primary text-sm font-semibold inline-flex items-center hover:translate-x-1 transition-transform">
              Learn More
              <span className="material-symbols-outlined ml-1 text-xs">
                chevron_right
              </span>
            </span>
          </Link>

          {/* Orthopedic Physiotherapy — image card with glass label */}
          <Link
            to={`/services/${ortho.id}`}
            className="bento-card col-span-1 md:col-span-4 min-h-[130px] rounded-2xl overflow-hidden relative group"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url('${getServiceImage(ortho.id)}')` }}
            />
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] transition-all group-hover:backdrop-blur-none" />
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="bg-surface-container-lowest/90 px-6 py-4 rounded-xl shadow-xl">
                <h3 className="text-lg font-headline font-bold text-primary">
                  {ortho.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-tight">
                  Bone &amp; Joint Recovery
                </p>
              </div>
            </div>
          </Link>

          {/* Pediatric Physiotherapy — tonal shift card */}
          <Link
            to={`/services/${pediatric.id}`}
            className="bento-card col-span-1 md:col-span-5 bg-secondary-container/30 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-headline font-bold text-on-secondary-fixed-variant mb-2">
                {pediatric.title}
              </h3>
              <p className="text-on-secondary-container text-sm leading-relaxed">
                {pediatric.shortDesc}
              </p>
            </div>
            <span className="mt-4 text-primary text-sm font-semibold inline-flex items-center">
              See How We Help
              <span className="material-symbols-outlined ml-1 text-xs">
                chevron_right
              </span>
            </span>
          </Link>

          {/* Dry Needling — small image overlay card */}
          <Link
            to={`/services/${needling.id}`}
            className="bento-card col-span-1 md:col-span-3 min-h-[170px] rounded-2xl overflow-hidden relative group"
          >
            <img
              alt={needling.title}
              src={getServiceImage(needling.id)}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-on-surface/40 flex flex-col justify-end p-6">
              <h3 className="text-lg font-headline font-bold text-white">
                {needling.title}
              </h3>
              <p className="text-white/80 text-xs mt-1">
                Targeted relief through precise technique.
              </p>
            </div>
          </Link>
        </div>

        {/* CTA to full services page */}
        <div className="flex justify-center mt-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary px-8 py-3.5 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            View All Services
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
