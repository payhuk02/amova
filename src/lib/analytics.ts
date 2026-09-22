/**
 * Analytics: Plausible (optional) + first-party page views for admin.
 * Country is resolved once per session (no IP stored server-side).
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

const SESSION_KEY = "amova_visit_sid";
const LAST_PATH_KEY = "amova_visit_last";
const COUNTRY_KEY = "amova_visit_cc";

let initialized = false;
let countryPromise: Promise<string | null> | null = null;

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

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function detectDevice(): "mobile" | "desktop" | "tablet" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (ua) return "desktop";
  return "unknown";
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    if (!host || host === window.location.hostname) return null;
    return host;
  } catch {
    return null;
  }
}

/** Resolve visitor country once per session (Cloudflare trace — no IP kept). */
async function detectCountryCode(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(COUNTRY_KEY);
    if (cached === "-") return null;
    if (cached && /^[A-Z]{2}$/.test(cached)) return cached;
  } catch {
    // ignore
  }

  if (!countryPromise) {
    countryPromise = (async () => {
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        window.clearTimeout(timer);
        const text = await res.text();
        const match = text.match(/(?:^|\n)loc=([A-Z]{2})(?:\n|$)/);
        const code = match?.[1] ?? null;
        try {
          sessionStorage.setItem(COUNTRY_KEY, code ?? "-");
        } catch {
          // ignore
        }
        return code;
      } catch {
        try {
          sessionStorage.setItem(COUNTRY_KEY, "-");
        } catch {
          // ignore
        }
        return null;
      }
    })();
  }

  return countryPromise;
}

/** Record SPA navigation for the admin Visiteurs dashboard. */
export async function trackPageView(path?: string) {
  trackEvent("pageview");

  if (typeof window === "undefined") return;

  const pathname = path ?? window.location.pathname;
  if (pathname.startsWith("/admin/visitors")) return;

  try {
    const last = sessionStorage.getItem(LAST_PATH_KEY);
    const now = Date.now();
    if (last) {
      const [prevPath, prevTs] = last.split("|");
      if (prevPath === pathname && now - Number(prevTs) < 15_000) return;
    }
    sessionStorage.setItem(LAST_PATH_KEY, `${pathname}|${now}`);
  } catch {
    // ignore storage errors
  }

  const sessionId = getOrCreateSessionId();
  const country = await detectCountryCode();

  const { error } = await supabase.rpc("record_page_view", {
    p_path: pathname,
    p_session_id: sessionId,
    p_referrer_host: referrerHost(),
    p_device: detectDevice(),
    p_country_code: country,
  });
  if (error && import.meta.env.DEV) {
    console.warn("[analytics] record_page_view failed", error.message);
  }
}
