import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/moneyfusion.ts";
import { getAiSettings, getModelForFeature, openRouterChatJson } from "../_shared/openrouter.ts";

interface KycResult {
  liveness_score: number;
  face_match_score: number;
  is_live_person: boolean;
  same_person: boolean;
  rejection_reason?: string;
}

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
    const { requestId, selfieUrl, avatarUrl, poseChallenge } = await req.json();

    if (!requestId || !selfieUrl) {
      return new Response(JSON.stringify({ error: "requestId et selfieUrl requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    const { data: request } = await supabase
      .from("verification_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Demande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileAvatar = avatarUrl as string | undefined;
    const challenge = poseChallenge || "sourire naturel";
    const settings = await getAiSettings();

    const contentParts: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Tu es un système KYC pour une app de rencontres. Analyse le selfie de vérification.
Défi demandé à l'utilisateur: "${challenge}".
Évalue:
1) liveness_score (0-1): personne réelle, pas une photo d'écran
2) face_match_score (0-1): même personne que la photo de profil (si fournie)
3) is_live_person (bool)
4) same_person (bool, false si pas de photo profil)
5) rejection_reason (string courte en français si rejet)

Réponds UNIQUEMENT en JSON valide.`,
      },
      { type: "image_url", image_url: { url: selfieUrl } },
    ];

    if (profileAvatar) {
      contentParts.push({ type: "image_url", image_url: { url: profileAvatar } });
    }

    const aiData = await openRouterChatJson({
      model: getModelForFeature(settings, "kyc"),
      messages: [{ role: "user", content: contentParts }],
      response_format: { type: "json_object" },
    }) as { choices?: Array<{ message?: { content?: string } }> };

    const raw = aiData.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as KycResult;

    const liveness = Math.min(1, Math.max(0, Number(parsed.liveness_score) || 0));
    const faceMatch = Math.min(1, Math.max(0, Number(parsed.face_match_score) || 0));
    const autoApproved =
      liveness >= 0.75 &&
      (profileAvatar ? faceMatch >= 0.72 : liveness >= 0.85) &&
      parsed.is_live_person !== false;

    const autoStatus = autoApproved ? "approved" : "pending_review";
    const rejectionReason = autoApproved
      ? null
      : parsed.rejection_reason || "Vérification manuelle requise";

    await supabase
      .from("verification_requests")
      .update({
        liveness_score: liveness,
        face_match_score: faceMatch,
        auto_review_status: autoStatus,
        rejection_reason: rejectionReason,
        pose_challenge: challenge,
        status: autoApproved ? "approved" : "pending",
        reviewed_at: autoApproved ? new Date().toISOString() : null,
      })
      .eq("id", requestId);

    if (autoApproved) {
      await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_status: "verified",
        })
        .eq("user_id", user.id);

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "verification",
        title: "Profil vérifié",
        body: "Félicitations ! Votre identité a été confirmée.",
      });
    }

    return new Response(
      JSON.stringify({
        autoApproved,
        liveness_score: liveness,
        face_match_score: faceMatch,
        status: autoApproved ? "verified" : "pending",
        message: autoApproved
          ? "Vérification automatique réussie"
          : "Votre demande sera examinée par notre équipe sous 24h",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-identity error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
