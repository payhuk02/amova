import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth } from "../_shared/auth.ts";
import { getAiSettings, getModelForFeature, openRouterChat } from "../_shared/openrouter.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    const { messages, userProfile } = await req.json();

    const profileContext = userProfile
      ? `L'utilisateur s'appelle ${userProfile.display_name || "inconnu"}, a ${userProfile.age || "?"} ans, habite à ${userProfile.city || "?"}, cherche ${userProfile.looking_for || "?"}. Bio: ${userProfile.bio || "aucune"}. Intérêts: ${(userProfile.interests || []).join(", ") || "aucun"}.`
      : "";

    const settings = await getAiSettings();

    const response = await openRouterChat({
      model: getModelForFeature(settings, "coach"),
      messages: [
        {
          role: "system",
          content: `Tu es un coach de rencontres bienveillant et expert sur l'app Amova. Tu donnes des conseils personnalisés, encourageants et concrets pour aider l'utilisateur dans sa vie amoureuse. Tu peux conseiller sur : les profils, les premiers messages, les rendez-vous, la confiance en soi, gérer le rejet, etc. Sois chaleureux, utilise des emojis avec parcimonie, et reste concis (2-4 phrases max par réponse). ${profileContext}`,
        },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 503) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dating-coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
