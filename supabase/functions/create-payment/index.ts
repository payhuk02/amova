import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import {
  createMoneyfusionPayment,
  getAppUrl,
  getServiceClient,
  normalizePhone,
  CONSUMABLE_PRICES,
  getSubscriptionAmount,
  type PaidPlan,
  type ConsumableSku,
  type BillingPeriod,
} from "../_shared/moneyfusion.ts";

const VALID_PERIODS = new Set(["monthly", "quarterly", "yearly"]);

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
    const { plan, phone, clientName, isRenewal, productSku, billingPeriod } = await req.json();

    const supabase = getServiceClient();
    const appUrl = getAppUrl();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    // Consumable one-shots
    if (productSku) {
      const sku = String(productSku) as ConsumableSku;
      if (!(sku in CONSUMABLE_PRICES)) {
        return new Response(JSON.stringify({ error: "Produit invalide" }), {
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

      const amount = CONSUMABLE_PRICES[sku];
      const { data: order, error: orderError } = await supabase
        .from("payment_orders")
        .insert({
          user_id: user.id,
          plan: null,
          amount,
          client_name: clientName,
          client_phone: phone,
          status: "pending",
          is_renewal: false,
          product_type: "consumable",
          product_sku: sku,
          billing_period: "monthly",
        })
        .select("id")
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || "Impossible de créer la commande");
      }

      const payment = await createMoneyfusionPayment({
        totalPrice: amount,
        articleLabel: `Amova ${sku}`,
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

      await supabase.from("payment_orders").update({ token_pay: payment.token }).eq("id", order.id);

      return new Response(JSON.stringify({ url: payment.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (plan !== "plus" && plan !== "premium" && plan !== "vip") {
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

    const periodRaw = String(billingPeriod || "monthly");
    if (!VALID_PERIODS.has(periodRaw)) {
      return new Response(JSON.stringify({ error: "Période invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const period = periodRaw as BillingPeriod;
    const paidPlan = plan as PaidPlan;
    const amount = getSubscriptionAmount(paidPlan, period);

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
        product_type: "subscription",
        product_sku: null,
        billing_period: period,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Impossible de créer la commande");
    }

    const payment = await createMoneyfusionPayment({
      totalPrice: amount,
      articleLabel: `Amova ${paidPlan} (${period})`,
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
      JSON.stringify({ url: payment.url }),
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
