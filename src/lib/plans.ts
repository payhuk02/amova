import type { PlanType } from "@/hooks/useSubscription";

export const PLAN_PRICES: Record<Exclude<PlanType, "free">, number> = {
  plus: 2900,
  premium: 5900,
  vip: 12900,
};

export const PLAN_LABELS: Record<PlanType, string> = {
  free: "Gratuit",
  plus: "Plus",
  premium: "Premium",
  vip: "VIP",
};

/** One-shot purchases (Moneyfusion consumables) */
export const CONSUMABLE_PRICES = {
  likes_reveal_24h: 1200,
  boost_24h: 1500,
  spotlight_24h: 2500,
} as const;

export type ConsumableSku = keyof typeof CONSUMABLE_PRICES;

export const CONSUMABLE_LABELS: Record<ConsumableSku, string> = {
  likes_reveal_24h: "Voir qui m'aime — 24h",
  boost_24h: "Boost profil — 24h",
  spotlight_24h: "Spotlight — 24h",
};
