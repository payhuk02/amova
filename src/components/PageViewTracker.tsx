import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/** Records first-party page views on every in-app navigation. */
export default function PageViewTracker() {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    // Slight delay so auth session is available for is_authed when possible
    const t = window.setTimeout(() => {
      void trackPageView(location.pathname);
    }, first.current ? 400 : 0);
    first.current = false;
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  return null;
}
