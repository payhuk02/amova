/**
 * Privacy-friendly analytics via Plausible.
 * Set VITE_PLAUSIBLE_DOMAIN=amova.space in production.
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

let initialized = false;

export function initAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain || initialized || typeof document === "undefined") return;

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = domain;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
  initialized = true;
}

export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window === "undefined" || !window.plausible) return;
  if (props && Object.keys(props).length > 0) {
    window.plausible(name, { props });
  } else {
    window.plausible(name);
  }
}

export function trackPageView() {
  trackEvent("pageview");
}
