import { Outlet } from "react-router-dom";
import Navbar from "./sections/Navbar.jsx";
import Footer from "./sections/Footer.jsx";

/**
 * Shared chrome for every route: the fixed Navbar (logo/title link back home)
 * on top, the routed page in the middle, and the Footer at the bottom. Routes
 * render into <Outlet/>. pt-20 offsets the fixed navbar height.
 */
export default function Layout() {
  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      <Navbar />
      <main className="pt-20 flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
