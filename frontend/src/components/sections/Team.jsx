import DOCTOR from "../../../assets/images/doctor.png";
export default function Team() {
  return (
    <section className="py-20 md:py-28 bg-surface-container-lowest overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary-container/10 rounded-2xl -rotate-2 group-hover:rotate-0 transition-transform duration-500"></div>
            <img
              alt="Dr. Maheshvar Prajapati"
              className="relative z-10 w-full aspect-[4/5] object-cover rounded-xl shadow-xl duration-700"
              src={DOCTOR}
            />
            <div className="absolute bottom-10 left-10 z-20 bg-white/90 backdrop-blur-md p-6 rounded-lg shadow-lg">
              <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">
                Board Certified
              </p>
              <h4 className="text-xl font-headline font-bold text-on-surface">
                Dr. Maheshvar Prajapati
              </h4>
            </div>
          </div>
          <div>
            <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">
              Medical Leadership
            </span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-on-surface mb-8 leading-tight">
              Guided by World-Class Expertise
            </h2>
            <p className="text-xl text-on-surface-variant leading-relaxed mb-8">
              Dr. Maheshvar Prajapati serves as our Senior Consultant, bringing
              over two decades of clinical mastery in advanced physiotherapy and
              sports medicine.
            </p>
            <div className="space-y-6 mb-12">
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
            <button className="bg-primary text-white px-8 py-4 rounded-lg font-bold hover:bg-primary-container transition-colors">
              Book a Consultation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
