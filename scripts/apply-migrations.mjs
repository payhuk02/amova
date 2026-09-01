#!/usr/bin/env node
/**
 * Apply pending SQL migrations via Supabase Management API.
 * Requires: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (or VITE_SUPABASE_PROJECT_ID)
 *
 * Usage: node scripts/apply-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_PROJECT_ID ||
  "yjnqpedabcgkwvnqaohs";

const pending = [
  "20260901050000_premium_saas_fixes.sql",
  "20260901060000_subscription_expiry.sql",
];

if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN manquant.\n" +
      "Créez un token sur https://supabase.com/dashboard/account/tokens\n" +
      "Puis: $env:SUPABASE_ACCESS_TOKEN=\"sbp_...\"; node scripts/apply-migrations.mjs\n\n" +
      "Ou appliquez manuellement dans SQL Editor:\n" +
      pending.map((f) => `  - supabase/migrations/${f}`).join("\n"),
  );
  process.exit(1);
}

for (const file of pending) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}...`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed ${file}: ${res.status} ${body}`);
    process.exit(1);
  }

  console.log(`OK: ${file}`);
}

console.log("All migrations applied.");
