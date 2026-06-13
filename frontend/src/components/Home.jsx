import Hero from "./sections/Hero.jsx";
import Stats from "./sections/Stats.jsx";
import Services from "./sections/Services.jsx";
import Team from "./sections/Team.jsx";
import ChooseUs from "./sections/ChooseUs.jsx";
import Testimonials from "./sections/Testimonials.jsx";
import Newsletter from "./sections/Newsletter.jsx";

// Navbar and Footer are provided by the shared <Layout>, so Home only renders
// the landing-page sections.
export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Services />
      <Team />
      <ChooseUs />
      <Testimonials />
      <Newsletter />
    </>
  );
}
