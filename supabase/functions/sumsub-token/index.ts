import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/moneyfusion.ts";
import {
  createSumsubAccessToken,
  createSumsubApplicant,
  isSumsubConfigured,
} from "../_shared/sumsub.ts";

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

  if (!isSumsubConfigured()) {
    return new Response(JSON.stringify({ error: "Sumsub non configuré" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("sumsub_applicant_id, verification_status")
      .eq("user_id", user.id)
      .single();

    if (profile?.verification_status === "verified") {
      return new Response(JSON.stringify({ error: "Déjà vérifié" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile?.sumsub_applicant_id) {
      const applicant = await createSumsubApplicant(user.id, user.email);
      await supabase
        .from("profiles")
        .update({ sumsub_applicant_id: applicant.id, verification_status: "pending" })
        .eq("user_id", user.id);
    }

    await supabase.from("verification_requests").insert({
      user_id: user.id,
      selfie_url: "sumsub",
      status: "pending",
      provider: "sumsub",
      auto_review_status: "processing",
    });

    const tokenData = await createSumsubAccessToken(user.id);

    return new Response(
      JSON.stringify({ accessToken: tokenData.token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sumsub-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
