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
  "20260901100000_push_kyc_renewals.sql",
  "20260901170000_p0_security_fixes.sql",
  "20260901180000_p1_features_fixes.sql",
  "20260901190000_p2_features_fixes.sql",
  "20260901200000_p3_features_fixes.sql",
  "20260901210000_optional_features.sql",
  "20260901220000_fix_openrouter_models.sql",
  "20260904130000_profile_passes.sql",
  "20260904140000_professional_kyc.sql",
  "20260904150000_kyc_id_recto_verso.sql",
  "20260904160000_p0_paywall_photos_messages.sql",
  "20260904170000_plus_plan_enum.sql",
  "20260904170100_plus_plan_entitlements.sql",
  "20260904180000_billing_periods.sql",
  "20260904190000_paid_trial.sql",
  "20260904200000_vip_priority_spotlight.sql",
  "20260904210000_profile_dob_identity_locks.sql",
  "20260904220000_audit_export_plus_age_lock.sql",
  "20260904230000_hetero_match_and_profile_rls.sql",
  "20260904240000_hotfix_admin_mass_and_hetero.sql",
  "20260904250000_admin_owner_profile_fields.sql",
  "20260905140000_strict_hetero_filters_and_likes.sql",
  "20260905150000_hetero_looking_for_check_and_likes_rls.sql",
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
    // Continue if objects already exist (migration partially/fully applied)
    if (
      res.status === 400 &&
      /already exists|duplicate|does not exist/i.test(body)
    ) {
      console.warn(`Skipped ${file} (likely already applied): ${body.slice(0, 200)}`);
      continue;
    }
    console.error(`Failed ${file}: ${res.status} ${body}`);
    process.exit(1);
  }

  console.log(`OK: ${file}`);
}

console.log("All migrations applied.");
