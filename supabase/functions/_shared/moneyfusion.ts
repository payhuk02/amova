import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PLAN_PRICES = {
  premium: 4900,
  vip: 9900,
} as const;

export type PaidPlan = keyof typeof PLAN_PRICES;

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

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalPrice: params.totalPrice,
      article: [{ [params.articleLabel]: params.totalPrice }],
      numeroSend: params.phone,
      nomclient: params.clientName,
      personal_Info: [{ userId: params.userId, orderId: params.orderId }],
      return_url: params.returnUrl,
      webhook_url: params.webhookUrl,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moneyfusion error: ${response.status} ${text}`);
  }

  return await response.json();
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
