import { getServiceClient } from "./moneyfusion.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type AiFeature = "match" | "compatibility" | "icebreaker" | "coach" | "kyc";

export interface AiSettings {
  enabled: boolean;
  model_match: string;
  model_compatibility: string;
  model_icebreaker: string;
  model_coach: string;
  model_kyc: string;
}

const DEFAULT_SETTINGS: AiSettings = {
  enabled: true,
  model_match: "google/gemini-2.0-flash-exp:free",
  model_compatibility: "google/gemini-2.0-flash-exp:free",
  model_icebreaker: "google/gemini-2.0-flash-exp:free",
  model_coach: "google/gemini-2.0-flash-exp:free",
  model_kyc: "google/gemini-2.0-flash-exp:free",
};

interface KeyEntry {
  id?: string;
  api_key: string;
}

function envFallbackKeys(): KeyEntry[] {
  const key =
    Deno.env.get("OPENROUTER_API_KEY") ??
    Deno.env.get("API_KEY_OPENROUTER");
  return key ? [{ api_key: key }] : [];
}

export async function getAiSettings(): Promise<AiSettings> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("ai_settings").select("*").limit(1).maybeSingle();

  if (!data) return DEFAULT_SETTINGS;

  return {
    enabled: data.enabled ?? true,
    model_match: data.model_match || DEFAULT_SETTINGS.model_match,
    model_compatibility: data.model_compatibility || DEFAULT_SETTINGS.model_compatibility,
    model_icebreaker: data.model_icebreaker || DEFAULT_SETTINGS.model_icebreaker,
    model_coach: data.model_coach || DEFAULT_SETTINGS.model_coach,
    model_kyc: data.model_kyc || DEFAULT_SETTINGS.model_kyc,
  };
}

export function getModelForFeature(settings: AiSettings, feature: AiFeature): string {
  switch (feature) {
    case "match":
      return settings.model_match;
    case "compatibility":
      return settings.model_compatibility;
    case "icebreaker":
      return settings.model_icebreaker;
    case "coach":
      return settings.model_coach;
    case "kyc":
      return settings.model_kyc;
  }
}

async function loadActiveKeys(): Promise<KeyEntry[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("ai_api_keys")
    .select("id, api_key")
    .eq("is_active", true)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({ id: row.id, api_key: row.api_key }));
}

function isCreditExhausted(status: number, body: string): boolean {
  if (status === 402) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("insufficient") ||
    lower.includes("credit") && (lower.includes("exhaust") || lower.includes("deplet")) ||
    lower.includes("quota exceeded") ||
    lower.includes("billing") && lower.includes("required")
  );
}

async function markKeyExhausted(id: string, message: string) {
  const supabase = getServiceClient();
  await supabase
    .from("ai_api_keys")
    .update({
      status: "exhausted",
      last_error_at: new Date().toISOString(),
      last_error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function markKeyError(id: string, message: string) {
  const supabase = getServiceClient();
  await supabase
    .from("ai_api_keys")
    .update({
      status: "error",
      last_error_at: new Date().toISOString(),
      last_error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function recordKeySuccess(id: string) {
  const supabase = getServiceClient();
  await supabase.rpc("increment_ai_key_usage", { p_key_id: id });
}

function openRouterHeaders(apiKey: string): Record<string, string> {
  const appUrl = Deno.env.get("APP_URL") ?? "https://www.amova.space";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": appUrl,
    "X-Title": "Amova",
  };
}

async function getKeyPool(): Promise<KeyEntry[]> {
  const dbKeys = await loadActiveKeys();
  const envKeys = envFallbackKeys();
  const seen = new Set<string>();
  const pool: KeyEntry[] = [];

  for (const entry of [...dbKeys, ...envKeys]) {
    if (seen.has(entry.api_key)) continue;
    seen.add(entry.api_key);
    pool.push(entry);
  }

  return pool;
}

export async function openRouterChat(body: Record<string, unknown>): Promise<Response> {
  const settings = await getAiSettings();
  if (!settings.enabled) {
    return new Response(JSON.stringify({ error: "IA désactivée par l'administrateur" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keys = await getKeyPool();
  if (keys.length === 0) {
    throw new Error("Aucune clé OpenRouter configurée");
  }

  let lastError = "Aucune clé disponible";

  for (const keyEntry of keys) {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: openRouterHeaders(keyEntry.api_key),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      if (keyEntry.id) await recordKeySuccess(keyEntry.id);
      return res;
    }

    const text = await res.text();
    lastError = text;

    if (isCreditExhausted(res.status, text)) {
      if (keyEntry.id) await markKeyExhausted(keyEntry.id, text);
      continue;
    }

    if (keyEntry.id && res.status >= 500) {
      await markKeyError(keyEntry.id, text);
    }

    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  throw new Error(`Crédits OpenRouter épuisés sur toutes les clés. ${lastError.slice(0, 200)}`);
}

export async function openRouterChatJson(body: Record<string, unknown>): Promise<unknown> {
  const res = await openRouterChat(body);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}
