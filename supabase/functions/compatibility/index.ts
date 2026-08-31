import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { userProfile, targetProfile } = await req.json();

    if (!userProfile || !targetProfile) {
      return new Response(JSON.stringify({ error: "Missing profiles" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en compatibilité amoureuse. Analyse les deux profils et donne un rapport détaillé de compatibilité. Sois optimiste mais honnête. Réponds en français.",
          },
          {
            role: "user",
            content: `Profil 1: ${userProfile.display_name}, ${userProfile.age} ans, ${userProfile.city}, Genre: ${userProfile.gender}, Bio: ${userProfile.bio || "aucune"}, Intérêts: ${(userProfile.interests || []).join(", ") || "aucun"}\n\nProfil 2: ${targetProfile.display_name}, ${targetProfile.age} ans, ${targetProfile.city}, Genre: ${targetProfile.gender}, Bio: ${targetProfile.bio || "aucune"}, Intérêts: ${(targetProfile.interests || []).join(", ") || "aucun"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_compatibility",
              description: "Return a detailed compatibility report",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Score 0-100" },
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        score: { type: "number" },
                        description: { type: "string" },
                      },
                      required: ["name", "score", "description"],
                      additionalProperties: false,
                    },
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                  },
                  challenges: {
                    type: "array",
                    items: { type: "string" },
                  },
                  advice: { type: "string" },
                },
                required: ["overall_score", "categories", "strengths", "challenges", "advice"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_compatibility" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No result" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compatibility error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
