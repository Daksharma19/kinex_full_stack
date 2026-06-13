import HERO_BG from "../../../assets/images/hero-background.jpg";
export default function Hero() {
  return (
    <section className="relative h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt="Clinical Hero Background"
          className="w-full h-full object-cover opacity-70"
          src={HERO_BG}
        />
        <div className="absolute inset-0 hero-gradient"></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 w-full">
        <div className="max-w-2xl text-white">
          
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight mb-8 leading-[1.1]">
            The Sanctuary of{" "}
            <span className="text-primary-fixed">Modern Clinical</span>{" "}
            Excellence.
          </h1>
          <p className="text-lg md:text-xl text-on-primary-container font-light leading-relaxed mb-10 opacity-90">
            Kinex integrates world-class medical expertise with a
            compassion-inspired patient experience. Advanced healthcare,
            delivered with human warmth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-surface-container-lowest text-primary px-8 py-4 rounded-lg font-bold text-lg shadow-xl hover:bg-primary-fixed transition-all active:scale-95">
              Book Appointments
            </button>
            <button
              asChild
              variant="secondary"
              className="h-12 rounded-xl bg-green-600 px-7 text-[15px] font-semibold text-kinex-on-surface hover:bg-[#2866d2]"
            >
              <a
                href="tel:+911122334455"
                className="inline-flex items-center gap-2"
              >
                Call Now
              </a>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
