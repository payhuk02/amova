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
    const { userProfile, candidates } = await req.json();

    if (!userProfile || !candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ scored: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = await getAiSettings();
    const userSummary = `Name: ${userProfile.display_name}, Age: ${userProfile.age}, City: ${userProfile.city}, Gender: ${userProfile.gender}, Looking for: ${userProfile.looking_for}, Bio: ${userProfile.bio || "none"}`;

    const candidateSummaries = candidates.map((c: { user_id: string; display_name: string; age: number; city: string; gender: string; bio?: string }) => ({
      user_id: c.user_id,
      summary: `Name: ${c.display_name}, Age: ${c.age}, City: ${c.city}, Gender: ${c.gender}, Bio: ${c.bio || "none"}`,
    }));

    const response = await openRouterChat({
      model: getModelForFeature(settings, "match"),
      messages: [
        {
          role: "system",
          content:
            "You are a dating compatibility scorer. Given a user profile and candidate profiles, score each candidate 0-100 on compatibility. Consider age proximity, same city, complementary bios. Return ONLY a JSON array like [{user_id, score}]. No explanation.",
        },
        {
          role: "user",
          content: `User: ${userSummary}\n\nCandidates:\n${candidateSummaries.map((c) => `${c.user_id}: ${c.summary}`).join("\n")}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_scores",
            description: "Return compatibility scores for candidates",
            parameters: {
              type: "object",
              properties: {
                scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      user_id: { type: "string" },
                      score: { type: "number" },
                    },
                    required: ["user_id", "score"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scores"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_scores" } },
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
      return new Response(JSON.stringify({ scored: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ scored: parsed.scores || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ scored: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-match error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", scored: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
