// Direct Postgres tool for SaveBack. Uses SUPABASE_DB_URL from .env.local.
// Connects straight to Postgres (not PostgREST), so it can read catalog views
// and run DDL. The secret never prints.
//
//   node scripts/db.mjs verify          # confirm schema + RLS + functions
//   node scripts/db.mjs apply <file>    # run a .sql file (e.g. sample/schema.sql)
//   node scripts/db.mjs sql "<query>"   # run an ad-hoc query

import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {
    /* no .env.local */
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_DB_URL;
if (!url) {
  console.error(
    "SUPABASE_DB_URL is empty in .env.local. Paste your Supabase connection\n" +
      "string (Project Settings → Database → Connection string → URI) there first.",
  );
  process.exit(1);
}

// Local Postgres (supabase start) doesn't speak SSL; hosted requires it.
const isLocal = /127\.0\.0\.1|localhost/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const EXPECTED_TABLES = [
  "profiles", "contacts", "saves", "matches", "blocks",
  "reports", "bans", "banned_identifiers", "boosts", "payments",
];
const EXPECTED_FNS = [
  "handle_new_save", "is_matched", "feed",
  "is_banned", "reputation", "activate_boost",
];

async function verify() {
  let pass = true;

  const rls = await client.query(
    `select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename`,
  );
  const rlsMap = Object.fromEntries(rls.rows.map((r) => [r.tablename, r.rowsecurity]));
  console.log("RLS per table (must all be true):");
  for (const t of EXPECTED_TABLES) {
    const on = rlsMap[t];
    const ok = on === true;
    if (!ok) pass = false;
    console.log(
      `  ${ok ? "✓" : "✗"} ${t.padEnd(20)} ${on === undefined ? "MISSING TABLE" : "rls_enabled=" + on}`,
    );
  }
  for (const e of rls.rows.filter((r) => !EXPECTED_TABLES.includes(r.tablename))) {
    console.log(`  • extra public table: ${e.tablename} (rls=${e.rowsecurity})`);
  }

  const pol = await client.query(
    `select tablename, count(*)::int n from pg_policies where schemaname='public' group by tablename`,
  );
  const polMap = Object.fromEntries(pol.rows.map((r) => [r.tablename, r.n]));
  console.log("\nPolicies per table (bans + banned_identifiers = 0 by design):");
  for (const t of EXPECTED_TABLES) console.log(`    ${t.padEnd(20)} ${polMap[t] ?? 0}`);

  const fns = await client.query(
    `select proname from pg_proc where pronamespace='public'::regnamespace and proname = any($1)`,
    [EXPECTED_FNS],
  );
  const have = new Set(fns.rows.map((r) => r.proname));
  console.log("\nFunctions:");
  for (const f of EXPECTED_FNS) {
    const ok = have.has(f);
    if (!ok) pass = false;
    console.log(`  ${ok ? "✓" : "✗"} ${f}`);
  }

  const trg = await client.query(
    `select tgname from pg_trigger where tgname='on_save_created'`,
  );
  const trgOk = trg.rows.length === 1;
  if (!trgOk) pass = false;
  console.log(`\nMatch trigger on_save_created: ${trgOk ? "✓ present" : "✗ MISSING"}`);

  const gate = await client.query(
    `select polname, pg_get_expr(polqual, polrelid) as expr
       from pg_policy where polrelid='public.contacts'::regclass and polcmd='r'`,
  );
  console.log("\nContacts SELECT gate (the consent gate):");
  for (const g of gate.rows) console.log(`  ${g.polname}: ${g.expr}`);
  const gateOk = gate.rows.some(
    (g) => /is_matched/.test(g.expr) && /auth\.uid/.test(g.expr),
  );
  if (!gateOk) pass = false;

  console.log(
    pass
      ? "\n✓ PASS — RLS on all 10 tables, all 6 functions, the trigger, and the owner-or-matched contacts gate are present."
      : "\n✗ FAIL — see the ✗ marks above.",
  );
  process.exitCode = pass ? 0 : 1;
}

async function main() {
  await client.connect();
  const cmd = process.argv[2];
  if (cmd === "verify") {
    await verify();
  } else if (cmd === "apply") {
    const file = process.argv[3];
    if (!file) throw new Error("usage: node scripts/db.mjs apply <file.sql>");
    await client.query(readFileSync(file, "utf8"));
    console.log(`✓ applied ${file}`);
  } else if (cmd === "sql") {
    const res = await client.query(process.argv.slice(3).join(" "));
    console.table(res.rows);
  } else {
    console.error("usage: node scripts/db.mjs verify | apply <file> | sql <query>");
    process.exitCode = 1;
  }
  await client.end();
}

main().catch((e) => {
  console.error("DB error:", e.message);
  process.exit(1);
});
