/**
 * Analytics: Plausible (optional) + first-party page views for admin.
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

const SESSION_KEY = "amova_visit_sid";
const LAST_PATH_KEY = "amova_visit_last";

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

/** Record SPA navigation for the admin Visiteurs dashboard. */
export async function trackPageView(path?: string) {
  trackEvent("pageview");

  if (typeof window === "undefined") return;

  const pathname = path ?? window.location.pathname;
  // Don't flood the DB with admin polling while looking at visitors
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
  const { error } = await supabase.rpc("record_page_view", {
    p_path: pathname,
    p_session_id: sessionId,
    p_referrer_host: referrerHost(),
    p_device: detectDevice(),
  });
  if (error && import.meta.env.DEV) {
    console.warn("[analytics] record_page_view failed", error.message);
  }
}
