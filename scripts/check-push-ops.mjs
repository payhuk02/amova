#!/usr/bin/env node
/**
 * Ops check for push / platform-cron.
 *
 * Usage:
 *   $env:CRON_SECRET="..."; $env:VITE_SUPABASE_URL="https://xxx.supabase.co"; node scripts/check-push-ops.mjs
 *
 * Or with project defaults from .env.example project ref.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const baseUrl = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).replace(/\/$/, "");
const cronSecret = process.env.CRON_SECRET;

const checklist = [
  ["VITE_VAPID_PUBLIC_KEY", "Client web push subscribe"],
  ["VAPID_PUBLIC_KEY", "Edge web-push send (supabase secrets)"],
  ["VAPID_PRIVATE_KEY", "Edge web-push send (supabase secrets)"],
  ["VAPID_SUBJECT", "mailto:… (supabase secrets, optional)"],
  ["FCM_SERVER_KEY", "Native Android push (optional)"],
  ["CRON_SECRET", "Authorize platform-cron"],
];

console.log("=== Amova push / cron ops checklist ===\n");

for (const [key, role] of checklist) {
  const local = process.env[key];
  const mark = local ? "local env set" : "not in local .env (may still be in supabase secrets)";
  console.log(`- ${key}: ${mark} — ${role}`);
}

if (!baseUrl) {
  console.error("\nMissing VITE_SUPABASE_URL / SUPABASE_URL — cannot call platform-cron.");
  process.exit(1);
}

if (!cronSecret) {
  console.log(`\nHealth probe skipped (set CRON_SECRET).
Manual health:
  curl "${baseUrl}/functions/v1/platform-cron?health=1" -H "X-Cron-Secret: VOTRE_SECRET"

Hourly cron (GitHub Actions / cron-job.org / etc.):
  curl -X POST "${baseUrl}/functions/v1/platform-cron" -H "X-Cron-Secret: VOTRE_SECRET"
`);
  process.exit(0);
}

const healthUrl = `${baseUrl}/functions/v1/platform-cron?health=1`;
console.log(`\nCalling GET ${healthUrl} ...`);
console.log("(Requires platform-cron redeployed with health endpoint)\n");

const res = await fetch(healthUrl, {
  method: "GET",
  headers: { "X-Cron-Secret": cronSecret },
});
const body = await res.text();
console.log(`HTTP ${res.status}`);
let parsed;
try {
  parsed = JSON.parse(body);
  console.log(JSON.stringify(parsed, null, 2));
} catch {
  console.log(body);
  process.exit(1);
}

if (!res.ok) process.exit(1);

if (!parsed.config) {
  console.warn(
    "\nWARN: Response has no `config` field — deploy the updated platform-cron function, then re-run.\n" +
      "  supabase functions deploy platform-cron\n" +
      "Until then, avoid calling this URL: older builds treat any auth request as a full queue drain.",
  );
  process.exit(2);
}

const cfg = parsed.config;
if (!cfg.vapidConfigured) {
  console.warn("\nWARN: VAPID keys missing on edge — web push will not send.");
}
if (!cfg.fcmConfigured) {
  console.warn("WARN: FCM_SERVER_KEY missing — native Android push will not send.");
}
if (cfg.vapidConfigured) {
  console.log("\nOK: VAPID configured on edge.");
}
