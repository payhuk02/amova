import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";
import { getAiSettings, getModelForFeature, openRouterChat } from "../_shared/openrouter.ts";

const GUEST_RATE = 12;
const USER_RATE = 40;
const WINDOW_MS = 60 * 60 * 1000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const AMOVA_KNOWLEDGE = `
Tu es « Amova Assistant », le chatbot officiel de la plateforme Amova (https://www.amova.space).

## Produit
- Amova = rencontres premium en Afrique (Côte d'Ivoire, Sénégal, etc.), matching hétérosexuel strict : hommes voient femmes, femmes voient hommes.
- Profils 18+, genre et date de naissance verrouillés après validation.
- KYC pro : pièce d'identité recto/verso (upload ou photo) + selfie caméra live, validation admin.

## Plans (FCFA / mois)
- Gratuit : 50 swipes/jour, 1 Super Like, 15 messages/jour, photos floutées, pas de « Qui m'aime ».
- Plus (2 900) : galerie HD / photos nettes, Qui m'aime, messages illimités, filtres avancés, 100 swipes.
- Premium (5 900) : swipes illimités + 1 boost/jour.
- VIP (12 900) : incognito, matching prioritaire, 3 boosts/jour, Spotlight hebdo.
- Essai Premium payant 3 jours : 990 FCFA (une fois).
- Consommables : Voir qui m'aime 24h (1 200), Boost 24h (1 500), Spotlight 24h (2 500).
- Paiements via Moneyfusion / Mobile Money.

## Navigation utile
- Inscription : /auth — FAQ : /faq — Contact : /contact — Abonnements : /premium — Vérification : /verification — Coach dating : /coach

## Règles de réponse
- Français clair, chaleureux, professionnel. 2 à 5 phrases max sauf si l'utilisateur demande du détail.
- Ne invente pas de fonctionnalités. Si tu ne sais pas : oriente vers /faq ou /contact.
- Ne demande jamais de mot de passe, OTP, ou données de carte.
- Ne donne pas de conseils illégaux / harcèlement. Encourage le respect et le consentement.
- Sur questions techniques de compte (suppression, paiement bloqué) : oriente vers Support /contact.
`;

function checkRate(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

async function optionalUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey || token === anonKey || token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return null;
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await optionalUser(req);
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "anon";
    const rateKey = user?.id ?? `ip:${clientIp}`;
    if (!checkRate(rateKey, user ? USER_RATE : GUEST_RATE)) {
      return new Response(JSON.stringify({ error: "Trop de messages. Réessayez plus tard." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const userProfile = body.userProfile ?? null;
    const mode = body.mode === "coach" && user ? "coach" : "support";

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "Message requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = await getAiSettings();
    if (!settings.enabled) {
      return new Response(
        JSON.stringify({
          error: "Assistant temporairement indisponible. Consultez la FAQ ou contactez le support.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profileContext =
      mode === "coach" && userProfile
        ? `Contexte membre connecté : ${userProfile.display_name || "membre"}, ${userProfile.age || "?"} ans, ${userProfile.city || "?"}, cherche ${userProfile.looking_for || "?"}. Bio: ${userProfile.bio || "—"}. Intérêts: ${(userProfile.interests || []).join(", ") || "—"}.`
        : user
          ? "L'utilisateur est connecté à Amova."
          : "Visiteur non connecté (page publique).";

    const coachExtra =
      mode === "coach"
        ? " Mode coach dating : conseille aussi profil, premiers messages, rendez-vous, confiance — toujours dans le cadre Amova."
        : " Mode support produit : priorise FAQ, plans, sécurité, inscription, paiements.";

    const response = await openRouterChat({
      model: getModelForFeature(settings, "coach"),
      messages: [
        {
          role: "system",
          content: `${AMOVA_KNOWLEDGE}\n${profileContext}\n${coachExtra}`,
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
      console.error("ai-chatbot error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chatbot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
