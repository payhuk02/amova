import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/moneyfusion.ts";
import { getAiSettings, getModelForFeature, openRouterChatJson } from "../_shared/openrouter.ts";

interface KycResult {
  liveness_score: number;
  face_match_score: number;
  document_readable: boolean;
  face_consistent_across_photos: boolean;
  is_live_person: boolean;
  same_person: boolean;
  rejection_reason?: string;
  admin_summary?: string;
}

function extractStoragePath(ref: string): string {
  if (ref.includes("/verifications/")) {
    const parts = ref.split("/verifications/");
    return parts[parts.length - 1].split("?")[0];
  }
  return ref;
}

function mimeFromPath(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function loadDataUrl(
  supabase: ReturnType<typeof getServiceClient>,
  ref: string,
): Promise<string | null> {
  if (!ref || ref === "sumsub") return null;
  const path = extractStoragePath(ref);
  const { data, error } = await supabase.storage.from("verifications").download(path);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return `data:${mimeFromPath(path)};base64,${encodeBase64(bytes)}`;
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
    const body = await req.json();
    const requestId = body.requestId as string | undefined;

    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    const { data: request } = await supabase
      .from("verification_requests")
      .select(
        "id, user_id, status, selfie_url, id_document_url, id_document_verso_url, recent_photo_1_url, recent_photo_2_url, pose_challenge, document_type",
      )
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Demande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selfieDataUrl = await loadDataUrl(supabase, request.selfie_url);
    if (!selfieDataUrl) {
      throw new Error("Impossible de charger le selfie");
    }

    const idDataUrl = await loadDataUrl(supabase, request.id_document_url || "");
    const idVersoDataUrl = await loadDataUrl(supabase, request.id_document_verso_url || "");
    const photo1DataUrl = await loadDataUrl(supabase, request.recent_photo_1_url || "");
    const photo2DataUrl = await loadDataUrl(supabase, request.recent_photo_2_url || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const settings = await getAiSettings();
    const challenge = request.pose_challenge || "visage clairement visible";

    const contentParts: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Tu es un assistant de pré-analyse KYC pour une plateforme de rencontres professionnelle.
Tu ne décides PAS de l'approbation — un humain valide toujours.
Documents fournis: pièce d'identité recto + verso (${request.document_type || "cni"}), selfie live caméra, 2 photos récentes.
Défi selfie: "${challenge}".

Vérifie aussi la lisibilité: texte et photo de la pièce doivent être visibles/lisibles sur recto et verso.

Évalue et réponds UNIQUEMENT en JSON:
{
  "liveness_score": 0-1,
  "face_match_score": 0-1,
  "document_readable": bool,
  "face_consistent_across_photos": bool,
  "is_live_person": bool,
  "same_person": bool,
  "rejection_reason": "string courte FR si doute",
  "admin_summary": "2 phrases max pour l'admin"
}`,
      },
      { type: "text", text: "Selfie de vérification (caméra live):" },
      { type: "image_url", image_url: { url: selfieDataUrl } },
    ];

    if (idDataUrl) {
      contentParts.push({ type: "text", text: "Pièce d'identité — RECTO:" });
      contentParts.push({ type: "image_url", image_url: { url: idDataUrl } });
    }
    if (idVersoDataUrl) {
      contentParts.push({ type: "text", text: "Pièce d'identité — VERSO:" });
      contentParts.push({ type: "image_url", image_url: { url: idVersoDataUrl } });
    }
    if (photo1DataUrl) {
      contentParts.push({ type: "text", text: "Photo récente 1:" });
      contentParts.push({ type: "image_url", image_url: { url: photo1DataUrl } });
    }
    if (photo2DataUrl) {
      contentParts.push({ type: "text", text: "Photo récente 2:" });
      contentParts.push({ type: "image_url", image_url: { url: photo2DataUrl } });
    }
    if (profile?.avatar_url) {
      contentParts.push({ type: "text", text: "Avatar profil:" });
      contentParts.push({ type: "image_url", image_url: { url: profile.avatar_url } });
    }

    let liveness = 0;
    let faceMatch = 0;
    let rejectionReason: string | null = "Pré-analyse IA indisponible — revue manuelle requise";
    let adminSummary: string | null = null;

    try {
      const aiData = await openRouterChatJson({
        model: getModelForFeature(settings, "kyc"),
        messages: [{ role: "user", content: contentParts }],
        response_format: { type: "json_object" },
      }) as { choices?: Array<{ message?: { content?: string } }> };

      const raw = aiData.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as KycResult;
      liveness = Math.min(1, Math.max(0, Number(parsed.liveness_score) || 0));
      faceMatch = Math.min(1, Math.max(0, Number(parsed.face_match_score) || 0));
      rejectionReason = parsed.rejection_reason || null;
      adminSummary = parsed.admin_summary || null;
    } catch (aiError) {
      console.error("KYC AI advisory failed:", aiError);
    }

    // Never auto-approve — human review only
    await supabase
      .from("verification_requests")
      .update({
        liveness_score: liveness,
        face_match_score: faceMatch,
        auto_review_status: "pending_review",
        rejection_reason: rejectionReason,
        admin_notes: adminSummary,
        status: "pending",
        reviewed_at: null,
      })
      .eq("id", requestId);

    await supabase
      .from("profiles")
      .update({
        verification_status: "pending",
        verification_photo_url: request.selfie_url,
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        autoApproved: false,
        liveness_score: liveness,
        face_match_score: faceMatch,
        status: "pending",
        message: "Dossier reçu. Notre équipe de conformité l'examinera sous 24–48h.",
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
