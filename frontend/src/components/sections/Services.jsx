import { Link } from "react-router-dom";

export default function Services() {
  return (
    <section className="py-14 md:py-28 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-4 md:gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-headline font-bold tracking-tight text-primary mb-4 md:mb-6">
              Comprehensive Clinical Excellence
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              We redefine the healing journey through a trinity of advanced
              therapeutic protocols, designed for longevity and rapid
              restorative outcomes.
            </p>
          </div>
          <Link className="text-primary font-bold flex items-center gap-2 group shrink-0" to="/services">
            Explore Our Services
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10">
          {/* Pain Relief */}
          <div className="bento-card bg-surface-container-low p-6 md:p-10 rounded-xl">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary-container rounded-lg flex items-center justify-center mb-5 md:mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">
                medical_services
              </span>
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">Pain Relief</h3>
            <p className="text-on-surface-variant leading-relaxed mb-6">
              Precision-targeted neuromuscular interventions to restore mobility
              and eliminate chronic discomfort at its physiological root.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-outline tracking-wider">
                CHRONIC
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-outline tracking-wider">
                ACUTE
              </span>
            </div>
          </div>

          {/* Muscle Recovery (highlighted) */}
          <div className="bento-card bg-primary text-white p-6 md:p-10 rounded-xl">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center mb-5 md:mb-8">
              <span className="material-symbols-outlined text-primary-fixed text-3xl">
                fitness_center
              </span>
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">
              Muscle Recovery
            </h3>
            <p className="text-on-primary-container leading-relaxed mb-6">
              Advanced kinesiotherapy protocols utilizing smart resistance
              technology to accelerate skeletal muscle rehabilitation.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-primary-fixed tracking-wider">
                ATHLETIC
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-primary-fixed tracking-wider">
                POST-OP
              </span>
            </div>
          </div>

          {/* Cellular Healing */}
          <div className="bento-card bg-surface-container-low p-6 md:p-10 rounded-xl">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-tertiary-fixed rounded-lg flex items-center justify-center mb-5 md:mb-8">
              <span className="material-symbols-outlined text-tertiary text-3xl">
                vital_signs
              </span>
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">
              Cellular Healing
            </h3>
            <p className="text-on-surface-variant leading-relaxed mb-6">
              Non-invasive metabolic optimization and regenerative therapies
              that stimulate natural tissue repair at the cellular level.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-outline tracking-wider">
                REGEN
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-outline tracking-wider">
                DETOX
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
