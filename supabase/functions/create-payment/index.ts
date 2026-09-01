import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import {
  createMoneyfusionPayment,
  getAppUrl,
  getServiceClient,
  normalizePhone,
  PLAN_PRICES,
  type PaidPlan,
} from "../_shared/moneyfusion.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { plan, phone, clientName, isRenewal } = await req.json();

    if (plan !== "premium" && plan !== "vip") {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!phone || !clientName) {
      return new Response(JSON.stringify({ error: "Téléphone et nom requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidPlan = plan as PaidPlan;
    const amount = PLAN_PRICES[paidPlan];
    const supabase = getServiceClient();

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        plan: paidPlan,
        amount,
        client_name: clientName,
        client_phone: phone,
        status: "pending",
        is_renewal: Boolean(isRenewal),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Impossible de créer la commande");
    }

    const appUrl = getAppUrl();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const payment = await createMoneyfusionPayment({
      totalPrice: amount,
      articleLabel: `Amova ${paidPlan}`,
      phone: normalizePhone(String(phone)),
      clientName: String(clientName).trim(),
      orderId: order.id,
      userId: user.id,
      returnUrl: `${appUrl}/premium/callback`,
      webhookUrl: `${supabaseUrl}/functions/v1/moneyfusion-webhook`,
    });

    if (!payment.statut || !payment.url || !payment.token) {
      await supabase.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
      throw new Error(payment.message || "Échec de l'initialisation du paiement");
    }

    await supabase
      .from("payment_orders")
      .update({ token_pay: payment.token })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ url: payment.url, token: payment.token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-payment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
