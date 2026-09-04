import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PLAN_PRICES = {
  plus: 2900,
  premium: 5900,
  vip: 12900,
} as const;

export type PaidPlan = keyof typeof PLAN_PRICES;

export type BillingPeriod = "monthly" | "quarterly" | "yearly";

export const BILLING_PERIODS: Record<
  BillingPeriod,
  { months: number; days: number; discount: number }
> = {
  monthly: { months: 1, days: 30, discount: 0 },
  quarterly: { months: 3, days: 90, discount: 0.15 },
  yearly: { months: 12, days: 365, discount: 0.3 },
};

export function getSubscriptionAmount(
  plan: PaidPlan,
  period: BillingPeriod = "monthly",
): number {
  const base = PLAN_PRICES[plan];
  const { months, discount } = BILLING_PERIODS[period];
  return Math.round(base * months * (1 - discount));
}

export const CONSUMABLE_PRICES = {
  likes_reveal_24h: 1200,
  boost_24h: 1500,
  spotlight_24h: 2500,
} as const;

export type ConsumableSku = keyof typeof CONSUMABLE_PRICES;

export interface MoneyfusionCreateResponse {
  statut?: boolean;
  token?: string;
  message?: string;
  url?: string;
}

export interface MoneyfusionStatusResponse {
  statut?: boolean;
  data?: {
    tokenPay?: string;
    statut?: string;
    Montant?: number;
  };
}

export interface MoneyfusionWebhookPayload {
  event?: string;
  tokenPay?: string;
  statut?: string;
  personal_Info?: Array<{ userId?: string; orderId?: string }>;
}

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key);
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `0${digits}`;
  return digits;
}

export function getAppUrl() {
  return Deno.env.get("APP_URL") ?? "http://localhost:5173";
}

export async function createMoneyfusionPayment(params: {
  totalPrice: number;
  articleLabel: string;
  phone: string;
  clientName: string;
  orderId: string;
  userId: string;
  returnUrl: string;
  webhookUrl: string;
}): Promise<MoneyfusionCreateResponse> {
  const apiUrl = Deno.env.get("MONEYFUSION_API_URL");
  if (!apiUrl) {
    throw new Error("MONEYFUSION_API_URL is not configured");
  }

  const response = await fetch(apiUrl.replace(/\/$/, ""), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalPrice: params.totalPrice,
      article: [{ abonnement: params.totalPrice }],
      numeroSend: params.phone,
      nomclient: params.clientName,
      personal_Info: [{ userId: params.userId, orderId: params.orderId }],
      return_url: params.returnUrl,
      webhook_url: params.webhookUrl,
    }),
  });

  const data = (await response.json()) as MoneyfusionCreateResponse;

  if (!response.ok) {
    throw new Error(data.message || `Moneyfusion error: ${response.status}`);
  }

  if (!data.statut) {
    throw new Error(
      data.message === "Application non approuvée."
        ? "Le compte marchand Moneyfusion n'est pas encore approuvé. Contactez Moneyfusion pour activer les paiements."
        : data.message || "Paiement refusé par Moneyfusion. Vérifiez que l'application est approuvée.",
    );
  }

  return data;
}

export async function checkMoneyfusionPayment(token: string): Promise<MoneyfusionStatusResponse> {
  const response = await fetch(`https://pay.moneyfusion.net/paiementNotif/${token}`);
  if (!response.ok) {
    throw new Error(`Moneyfusion status error: ${response.status}`);
  }
  return await response.json();
}

export function isPaymentSuccessful(status?: string, event?: string): boolean {
  if (status === "paid") return true;
  if (event === "payin.session.completed") return true;
  return false;
}
