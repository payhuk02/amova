import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS_PATH } from "@/lib/limits";
import { playSmsTone } from "@/lib/smsTone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "amova_like_nudge_at";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SCROLL_THRESHOLD = 220;

const BLOCKED_PATHS = [
  "/premium",
  "/premium/callback",
  "/auth",
  "/profile-setup",
  "/verification",
  "/admin",
];

function wasShownRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Free-plan engagement nudge: after signup scroll, show a “someone liked you”
 * popup that routes to subscription plans on click.
 */
export default function LikedYouNudge() {
  const { user } = useAuth();
  const { currentPlan, isLoading: planLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const armed = useRef(false);
  const triggered = useRef(false);
  const scrolled = useRef(0);

  const pathBlocked = BLOCKED_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (!user || planLoading || pathBlocked) return;
    if (currentPlan !== "free") return;
    if (wasShownRecently() || triggered.current) return;

    armed.current = true;
    scrolled.current = 0;

    const tryOpen = () => {
      if (!armed.current || triggered.current) return;
      if (wasShownRecently()) return;
      triggered.current = true;
      armed.current = false;
      markShown();
      setOpen(true);
    };

    const onScrollish = (delta: number) => {
      if (!armed.current || triggered.current) return;
      scrolled.current += Math.abs(delta);
      if (scrolled.current >= SCROLL_THRESHOLD) tryOpen();
    };

    const onScroll = (e: Event) => {
      const t = e.target;
      let top = window.scrollY || document.documentElement.scrollTop || 0;
      if (t instanceof HTMLElement && t.scrollTop > 0) top = t.scrollTop;
      if (top >= SCROLL_THRESHOLD) tryOpen();
      else onScrollish(12);
    };

    const onWheel = (e: WheelEvent) => onScrollish(e.deltaY);
    const onTouchMove = () => onScrollish(24);

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      armed.current = false;
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [user, currentPlan, planLoading, pathBlocked, location.pathname]);

  useEffect(() => {
    if (!open) return;
    void playSmsTone();
  }, [open]);

  const goToPlans = () => {
    setOpen(false);
    navigate(PLANS_PATH);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-2xl border-border p-0 overflow-hidden sm:rounded-2xl">
        <div className="bg-gradient-to-b from-primary/15 to-background px-6 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/10">
            <Heart className="h-7 w-7 text-brand fill-brand/20" strokeWidth={1.75} />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-xl font-medium text-center">
              Quelqu&apos;un a liké votre profil
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
              Une personne s&apos;intéresse à vous. Passez Plus pour découvrir qui, et
              voir les photos nettes.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="hero" className="w-full" onClick={goToPlans}>
              Voir qui m&apos;aime
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>
              Plus tard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
