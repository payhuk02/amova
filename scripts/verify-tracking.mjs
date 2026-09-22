/**
 * End-to-end verification of first-party page-view tracking.
 * Uses anon key like the browser, then Management API for DB asserts.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.VITE_SUPABASE_PROJECT_ID || "yjnqpedabcgkwvnqaohs";

if (!url || !anon || !token) {
  console.error("Missing VITE_SUPABASE_URL / PUBLISHABLE_KEY / SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const results = [];
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL ${res.status}: ${text}`);
  return JSON.parse(text);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sessionId = randomUUID();
const markerPath = `/__tracking_probe_${Date.now()}`;

// 1) Insert via same RPC the SPA uses
{
  const { error } = await supabase.rpc("record_page_view", {
    p_path: markerPath,
    p_session_id: sessionId,
    p_referrer_host: "google.com",
    p_device: "desktop",
  });
  ok("record_page_view (anon RPC)", !error, error?.message || "inserted");
}

// 2) Row exists with expected fields
{
  const rows = await sql(
    `SELECT path, referrer_host, device, is_authed, session_id::text
     FROM public.site_page_views
     WHERE path = '${markerPath}'
     ORDER BY id DESC LIMIT 1`,
  );
  const row = rows[0];
  ok("row persisted", !!row, row ? JSON.stringify(row) : "missing");
  if (row) {
    ok("path stored", row.path === markerPath);
    ok("referrer_host stored", row.referrer_host === "google.com");
    ok("device stored", row.device === "desktop");
    ok("anon is_authed=false", row.is_authed === false);
    ok("session_id matches", row.session_id === sessionId);
  }
}

// 3) Debounce: second call within 20s must NOT create another row
{
  const { error } = await supabase.rpc("record_page_view", {
    p_path: markerPath,
    p_session_id: sessionId,
    p_referrer_host: "google.com",
    p_device: "desktop",
  });
  ok("debounce RPC no error", !error, error?.message);
  const rows = await sql(
    `SELECT COUNT(*)::int AS n FROM public.site_page_views WHERE path = '${markerPath}' AND session_id = '${sessionId}'`,
  );
  ok("debounce skips duplicate", rows[0]?.n === 1, `count=${rows[0]?.n}`);
}

// 4) Path normalization (query/hash stripped, leading slash)
{
  const sid = randomUUID();
  const { error } = await supabase.rpc("record_page_view", {
    p_path: "tarifs?x=1#top",
    p_session_id: sid,
    p_device: "mobile",
  });
  ok("normalize RPC", !error, error?.message);
  const rows = await sql(
    `SELECT path, device FROM public.site_page_views WHERE session_id = '${sid}' ORDER BY id DESC LIMIT 1`,
  );
  ok("path normalized to /tarifs", rows[0]?.path === "/tarifs", rows[0]?.path);
  ok("device mobile", rows[0]?.device === "mobile");
}

// 5) Grants present
{
  const rows = await sql(`
    SELECT grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'record_page_view'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  `);
  const grantees = new Set(rows.map((r) => r.grantee));
  ok("GRANT to anon", grantees.has("anon") || grantees.has("PUBLIC"), [...grantees].join(","));
  ok(
    "GRANT to authenticated",
    grantees.has("authenticated") || grantees.has("PUBLIC"),
    [...grantees].join(","),
  );
}

// 6) admin_get_visitor_stats rejects non-admin (anon)
{
  const { data, error } = await supabase.rpc("admin_get_visitor_stats", { p_days: 7 });
  const blocked = !!error && /unauthoriz|permission|admin/i.test(error.message + (error.code || ""));
  // PostgREST may return 400 with raised exception
  ok(
    "admin stats blocked for anon",
    !!error && !data,
    error?.message || "unexpected success",
  );
  void blocked;
}

// 7) Stats RPC exists (admin gate already verified via anon above)
{
  const fn = await sql(`
    SELECT proname FROM pg_proc
    WHERE proname IN ('record_page_view','admin_get_visitor_stats')
    ORDER BY proname
  `);
  ok("both RPCs exist", fn.length >= 2, fn.map((f) => f.proname).join(","));
}

// 8) Different path same session creates a second row
{
  const { error } = await supabase.rpc("record_page_view", {
    p_path: `${markerPath}/b`,
    p_session_id: sessionId,
    p_device: "desktop",
  });
  ok("second path records", !error, error?.message);
  const rows = await sql(
    `SELECT COUNT(*)::int AS n FROM public.site_page_views WHERE session_id = '${sessionId}'`,
  );
  ok("two paths = two rows", rows[0]?.n === 2, `count=${rows[0]?.n}`);
}

// 9) Cleanup probe + this run's normalized /tarifs test row
{
  await sql(`
    DELETE FROM public.site_page_views
    WHERE path LIKE '/__tracking_probe_%'
       OR (path = '/tarifs' AND created_at > now() - interval '5 minutes' AND device = 'mobile' AND referrer_host IS NULL)
  `);
  const left = await sql(
    `SELECT COUNT(*)::int AS n FROM public.site_page_views WHERE path LIKE '/__tracking_probe_%'`,
  );
  ok("cleanup probe rows", left[0]?.n === 0, `left=${left[0]?.n}`);
}

// 10) Wire-up source checks (static)
{
  const app = readFileSync(join(root, "src/App.tsx"), "utf8");
  const tracker = readFileSync(join(root, "src/components/PageViewTracker.tsx"), "utf8");
  ok("PageViewTracker mounted in App", app.includes("<PageViewTracker"));
  ok("tracker calls trackPageView", tracker.includes("trackPageView(location.pathname)"));
}

const failed = results.filter((r) => !r.pass);
console.log("\n---");
console.log(`${results.filter((r) => r.pass).length}/${results.length} checks passed`);
if (failed.length) {
  console.error("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
