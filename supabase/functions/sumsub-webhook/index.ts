import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/moneyfusion.ts";
import {
  type SumsubWebhookPayload,
  verifySumsubWebhookDigest,
} from "../_shared/sumsub.ts";

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
    const rawBody = await req.text();
    const digest = req.headers.get("X-Payload-Digest");

    const valid = await verifySumsubWebhookDigest(rawBody, digest);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody) as SumsubWebhookPayload;
    const supabase = getServiceClient();

    const userId = payload.externalUserId;
    const applicantId = payload.applicantId;
    const reviewAnswer = payload.reviewResult?.reviewAnswer;

    if (!userId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.type === "applicantReviewed" || payload.reviewStatus === "completed") {
      if (reviewAnswer === "GREEN") {
        await supabase.rpc("complete_identity_verification", {
          p_user_id: userId,
          p_provider: "sumsub",
          p_external_id: applicantId || null,
        });
      } else if (reviewAnswer === "RED") {
        await supabase
          .from("profiles")
          .update({ verification_status: "rejected" })
          .eq("user_id", userId);

        await supabase
          .from("verification_requests")
          .update({
            status: "rejected",
            rejection_reason: payload.reviewResult?.moderationComment || "Vérification refusée",
            reviewed_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("status", "pending");

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "verification",
          title: "Vérification refusée",
          body: "Votre vérification d'identité n'a pas pu être validée. Vous pouvez réessayer.",
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sumsub-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
