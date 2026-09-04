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

export type BillingPeriod = "monthly" | "quarterly" | "yearly";

export const BILLING_PERIODS: Record<
  BillingPeriod,
  { label: string; months: number; days: number; discount: number }
> = {
  monthly: { label: "Mensuel", months: 1, days: 30, discount: 0 },
  quarterly: { label: "Trimestriel", months: 3, days: 90, discount: 0.15 },
  yearly: { label: "Annuel", months: 12, days: 365, discount: 0.3 },
};

/** Total FCFA for a plan × billing period (discounts applied). */
export function getSubscriptionAmount(
  plan: Exclude<PlanType, "free">,
  period: BillingPeriod = "monthly",
): number {
  const base = PLAN_PRICES[plan];
  const { months, discount } = BILLING_PERIODS[period];
  return Math.round(base * months * (1 - discount));
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

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

/** One-time paid Premium trial (eligibility enforced server-side). */
export const PAID_TRIAL = {
  plan: "premium" as const,
  days: 3,
  price: 990,
  label: "Essai Premium 3 jours",
};
