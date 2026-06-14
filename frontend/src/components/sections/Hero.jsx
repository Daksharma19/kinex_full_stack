import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HERO_BG from "../../../assets/images/hero-background.jpg";

export default function Hero() {
  const navigate = useNavigate();
  const { session } = useAuth();

  function handleBookAppointment() {
    // Logged-in users go straight to the dashboard to book; everyone else
    // is sent to login (ProtectedRoute returns them to /dashboard afterwards).
    navigate(session ? "/dashboard" : "/login");
  }

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden py-28 md:py-0">
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
            <button
              onClick={handleBookAppointment}
              className="bg-surface-container-lowest text-primary px-8 py-4 rounded-lg font-bold text-lg shadow-xl hover:bg-primary-fixed transition-all active:scale-95"
            >
              Book Appointments
            </button>
            <a
              href="tel:+919868421785"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              Call Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
