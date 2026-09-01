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
    const { userProfile, targetProfile } = await req.json();

    if (!userProfile || !targetProfile) {
      return new Response(JSON.stringify({ error: "Missing profiles" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = await getAiSettings();

    const response = await openRouterChat({
      model: getModelForFeature(settings, "icebreaker"),
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en séduction et premiers messages sur une app de rencontre. Génère 3 premiers messages créatifs, drôles et personnalisés basés sur les profils des deux personnes. Sois original, évite les clichés. Les messages doivent être courts (1-2 phrases max), engageants et donner envie de répondre. Réponds en français.",
        },
        {
          role: "user",
          content: `Mon profil: ${userProfile.display_name}, ${userProfile.age} ans, ${userProfile.city}, Bio: ${userProfile.bio || "aucune"}, Intérêts: ${(userProfile.interests || []).join(", ") || "aucun"}\n\nProfil cible: ${targetProfile.display_name}, ${targetProfile.age} ans, ${targetProfile.city}, Bio: ${targetProfile.bio || "aucune"}, Intérêts: ${(targetProfile.interests || []).join(", ") || "aucun"}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_icebreakers",
            description: "Return 3 icebreaker messages",
            parameters: {
              type: "object",
              properties: {
                messages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      emoji: { type: "string" },
                    },
                    required: ["text", "emoji"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["messages"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_icebreakers" } },
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
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ messages: parsed.messages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ messages: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("icebreaker error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", messages: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
