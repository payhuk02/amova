import type { PlanType } from "@/hooks/useSubscription";

export const PLAN_PRICES: Record<Exclude<PlanType, "free">, number> = {
  premium: 4900,
  vip: 9900,
};

export const PLAN_LABELS: Record<PlanType, string> = {
  free: "Gratuit",
  premium: "Premium",
  vip: "VIP",
};
