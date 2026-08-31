import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import {
  checkMoneyfusionPayment,
  getServiceClient,
  isPaymentSuccessful,
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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const { data: order } = await supabase
      .from("payment_orders")
      .select("status, plan")
      .eq("token_pay", token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "paid") {
      return new Response(
        JSON.stringify({ status: "paid", plan: order.plan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const remote = await checkMoneyfusionPayment(token);
    const paid = isPaymentSuccessful(remote.data?.statut);

    if (paid) {
      await supabase.rpc("fulfill_payment_by_token", { p_token: token });
      return new Response(
        JSON.stringify({ status: "paid", plan: order.plan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ status: remote.data?.statut || "pending" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-payment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
