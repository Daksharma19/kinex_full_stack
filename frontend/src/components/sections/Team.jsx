import DOCTOR from "../../../assets/images/doctor.png";
export default function Team() {
  return (
    <section className="py-14 md:py-28 bg-surface-container-lowest overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">
          <div className="relative group max-w-xs sm:max-w-sm mx-auto lg:max-w-none w-full">
            <div className="absolute -inset-4 bg-primary-container/10 rounded-2xl -rotate-2 group-hover:rotate-0 transition-transform duration-500"></div>
            <img
              alt="Dr. Maheshvar Prajapati"
              className="relative z-10 w-full aspect-[4/5] object-cover rounded-xl shadow-xl duration-700"
              src={DOCTOR}
            />
            <div className="absolute bottom-5 left-5 md:bottom-10 md:left-10 z-20 bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-lg shadow-lg">
              <h4 className="text-base md:text-xl font-headline font-bold text-on-surface">
                Dr. Maheshvar Prajapati
              </h4>
            </div>
          </div>
          <div>
            <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">
              Medical Leadership
            </span>
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-on-surface mb-4 md:mb-8 leading-tight">
              Guided by World-Class Expertise
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-6 md:mb-8">
              Dr. Maheshvar Prajapati serves as our Senior Consultant, bringing
              over two decades of clinical mastery in advanced physiotherapy and
              sports medicine.
            </p>
            <div className="space-y-5 md:space-y-6 mb-6 md:mb-12">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-primary">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                  <h5 className="font-bold text-on-surface">
                    Senior Consultant MD
                  </h5>
                  <p className="text-on-surface-variant">
                    Lead strategist for patient outcome protocols and medical
                    innovation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 text-primary">
                  <span className="material-symbols-outlined">
                    workspace_premium
                  </span>
                </div>
                <div>
                  <h5 className="font-bold text-on-surface">
                    Specialized Practice
                  </h5>
                  <p className="text-on-surface-variant">
                    Focusing on complex skeletal rehabilitation and geriatric
                    vitality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
