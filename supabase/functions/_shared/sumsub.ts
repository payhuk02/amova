const SUMSUB_BASE = "https://api.sumsub.com";

function getConfig() {
  const appToken = Deno.env.get("SUMSUB_APP_TOKEN");
  const secretKey = Deno.env.get("SUMSUB_SECRET_KEY");
  const levelName = Deno.env.get("SUMSUB_LEVEL_NAME") || "basic-kyc-level";
  if (!appToken || !secretKey) {
    throw new Error("Sumsub is not configured");
  }
  return { appToken, secretKey, levelName };
}

async function signRequest(
  method: string,
  path: string,
  body: string,
  secretKey: string,
): Promise<{ ts: string; signature: string }> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = encoder.encode(ts + method.toUpperCase() + path + body);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { ts, signature };
}

async function sumsubRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { appToken, secretKey } = getConfig();
  const bodyStr = body ? JSON.stringify(body) : "";
  const { ts, signature } = await signRequest(method, path, bodyStr, secretKey);

  const response = await fetch(`${SUMSUB_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": appToken,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
    body: body ? bodyStr : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sumsub API error ${response.status}: ${text}`);
  }

  return await response.json() as T;
}

export async function createSumsubApplicant(userId: string, email?: string) {
  const { levelName } = getConfig();
  return await sumsubRequest<{ id: string }>("POST", `/resources/applicants?levelName=${encodeURIComponent(levelName)}`, {
    externalUserId: userId,
    email: email || undefined,
  });
}

export async function createSumsubAccessToken(userId: string) {
  const { levelName } = getConfig();
  const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=600`;
  return await sumsubRequest<{ token: string; userId: string }>("POST", path);
}

export async function verifySumsubWebhookDigest(
  rawBody: string,
  digestHeader: string | null,
): Promise<boolean> {
  const secretKey = Deno.env.get("SUMSUB_WEBHOOK_SECRET") || Deno.env.get("SUMSUB_SECRET_KEY");
  if (!secretKey || !digestHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const digest = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return digest === digestHeader.toLowerCase();
}

export function isSumsubConfigured(): boolean {
  return Boolean(Deno.env.get("SUMSUB_APP_TOKEN") && Deno.env.get("SUMSUB_SECRET_KEY"));
}

export interface SumsubWebhookPayload {
  type?: string;
  applicantId?: string;
  externalUserId?: string;
  reviewResult?: {
    reviewAnswer?: string;
    moderationComment?: string;
  };
  reviewStatus?: string;
}
