import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";
import {
  checkMoneyfusionPayment,
  getServiceClient,
  isPaymentSuccessful,
  type MoneyfusionWebhookPayload,
} from "../_shared/moneyfusion.ts";

async function fulfillToken(token: string, expectedAmount?: number) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("fulfill_payment_by_token", {
    p_token: token,
    p_expected_amount: expectedAmount ?? null,
  });
  if (error) {
    console.error("fulfill_payment_by_token error:", error);
    return false;
  }
  return Boolean(data);
}

function verifyWebhookSecret(req: Request): boolean {
  const secret = Deno.env.get("MONEYFUSION_WEBHOOK_SECRET");
  if (!secret) return true;
  const header =
    req.headers.get("X-Webhook-Secret") ??
    req.headers.get("X-Moneyfusion-Secret");
  return header === secret;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!verifyWebhookSecret(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as MoneyfusionWebhookPayload;
    const token = payload.tokenPay;

    if (!token) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    if (payload.event === "payin.session.cancelled") {
      await supabase
        .from("payment_orders")
        .update({ status: "cancelled" })
        .eq("token_pay", token)
        .neq("status", "paid");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remote = await checkMoneyfusionPayment(token);
    if (!isPaymentSuccessful(remote.data?.statut, payload.event)) {
      return new Response(JSON.stringify({ received: true, status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await supabase
      .from("payment_orders")
      .select("amount, status")
      .eq("token_pay", token)
      .maybeSingle();

    if (!order) {
      console.error("Webhook: order not found for token", token);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "paid") {
      return new Response(JSON.stringify({ received: true, status: "paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteAmount = remote.data?.Montant;
    if (remoteAmount != null && remoteAmount !== order.amount) {
      console.error(
        `Webhook amount mismatch: expected ${order.amount}, got ${remoteAmount}`,
      );
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await fulfillToken(token, order.amount);

    return new Response(JSON.stringify({ received: true, status: "paid" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moneyfusion-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
