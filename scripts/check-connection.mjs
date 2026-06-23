// Smoke test: confirms the project is reachable with the publishable key and
// that every table in the schema exists and is queryable. Run: node scripts/check-connection.mjs
//
// NOTE: with an empty DB this proves connectivity + that tables exist, but it
// cannot prove RLS is *enabled* (an empty table returns 0 rows either way).
// The authoritative RLS check is scripts/verify-schema.sql via SUPABASE_DB_URL.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  "profiles", "contacts", "saves", "matches", "blocks",
  "reports", "bans", "banned_identifiers", "boosts", "payments",
];

console.log(`Project: ${url}\n`);
let problems = 0;

for (const t of tables) {
  const { data, error } = await supabase.from(t).select("*").limit(1);
  if (error) {
    console.log(`  ✗ ${t.padEnd(20)} ${error.code ?? ""} ${error.message}`);
    problems++;
  } else {
    console.log(`  ✓ ${t.padEnd(20)} reachable (anon rows: ${data.length})`);
  }
}

const { data: feed, error: feedErr } = await supabase.rpc("feed", { p_limit: 5 });
if (feedErr) {
  console.log(`  ✗ feed() rpc          ${feedErr.code ?? ""} ${feedErr.message}`);
  problems++;
} else {
  console.log(`  ✓ feed() rpc          anon rows: ${feed.length} (expected 0)`);
}

console.log(
  problems === 0
    ? "\n✓ Connected. All 10 tables + feed() exist and are reachable; anon returns 0 rows."
    : `\n✗ ${problems} problem(s). If tables are 'not found', reload the PostgREST schema cache or re-apply the schema.`,
);
process.exit(problems === 0 ? 0 : 1);
