import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";
import {
  checkMoneyfusionPayment,
  getServiceClient,
  isPaymentSuccessful,
  type MoneyfusionWebhookPayload,
} from "../_shared/moneyfusion.ts";

async function fulfillToken(token?: string) {
  if (!token) return false;
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("fulfill_payment_by_token", {
    p_token: token,
  });
  if (error) {
    console.error("fulfill_payment_by_token error:", error);
    return false;
  }
  return Boolean(data);
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

  try {
    const payload = (await req.json()) as MoneyfusionWebhookPayload;
    const token = payload.tokenPay;

    if (isPaymentSuccessful(payload.statut, payload.event)) {
      await fulfillToken(token);
    } else if (payload.event === "payin.session.cancelled") {
      const supabase = getServiceClient();
      if (token) {
        await supabase
          .from("payment_orders")
          .update({ status: "cancelled" })
          .eq("token_pay", token)
          .neq("status", "paid");
      }
    } else if (token) {
      const status = await checkMoneyfusionPayment(token);
      if (isPaymentSuccessful(status.data?.statut)) {
        await fulfillToken(token);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
