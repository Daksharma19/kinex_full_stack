import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the scroll position to the top on every route change. React Router
 * keeps the previous page's scroll offset by default, so navigating from a
 * scrolled-down page would otherwise open the next page partway down (often at
 * the footer). Render once inside <BrowserRouter>.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
