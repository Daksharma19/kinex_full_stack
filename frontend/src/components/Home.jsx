import Navbar from "./sections/Navbar.jsx";
import Hero from "./sections/Hero.jsx";
import Stats from "./sections/Stats.jsx";
import Services from "./sections/Services.jsx";
import Team from "./sections/Team.jsx";
import ChooseUs from "./sections/ChooseUs.jsx";
import Testimonials from "./sections/Testimonials.jsx";
import Newsletter from "./sections/Newsletter.jsx";
import Footer from "./sections/Footer.jsx";

export default function Home() {
  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      <Navbar />
      <main className="pt-20">
        <Hero />
        <Stats />
        <Services />
        <Team />
        <ChooseUs />
        <Testimonials />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
