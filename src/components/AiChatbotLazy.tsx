import { lazy, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";

const AiChatbot = lazy(() => import("@/components/AiChatbot"));

const HIDDEN_EXACT = new Set([
  "/",
  "/confidentialite",
  "/conditions",
  "/faq",
  "/contact",
  "/coach",
  "/auth",
]);

/** Loads Aide Amova only on in-app routes (keeps marketing JS lighter). */
export default function AiChatbotLazy() {
  const { pathname } = useLocation();
  const hidden = useMemo(
    () =>
      HIDDEN_EXACT.has(pathname) ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/premium/callback"),
    [pathname],
  );

  if (hidden) return null;

  return (
    <Suspense fallback={null}>
      <AiChatbot />
    </Suspense>
  );
}
