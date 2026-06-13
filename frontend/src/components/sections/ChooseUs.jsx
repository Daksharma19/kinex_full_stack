import SPACE from "../../../assets/images/space.png";
export default function ChooseUs() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-10 md:p-16 lg:p-24 flex flex-col justify-center">
              <h2 className="text-4xl font-headline font-bold text-primary mb-8 leading-tight">
                The Architecture of Recovery
              </h2>
              <p className="text-on-surface-variant text-lg mb-12 leading-relaxed">
                Our facilities are meticulously designed to reduce cortisol and
                promote parasympathetic activation—essential states for deep
                physiological healing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-primary font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined">schedule</span>
                    Reduced Wait Times
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Efficiency that respects your time and peace of mind.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-primary font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined">
                      shield_person
                    </span>
                    Private Suites
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Exclusive consultation zones for absolute confidentiality.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-[500px] lg:h-auto">
              <img
                alt="Healing Space Interior"
                className="w-full h-full object-cover"
                src={SPACE}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
