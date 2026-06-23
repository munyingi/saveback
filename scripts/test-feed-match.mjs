// Integration test for the core security model against the LOCAL stack.
// Creates two throwaway verified users (admin API), then acts AS each with a
// real RLS-bound session to prove: feed ranking, the save→match trigger, and
// the consent gate (a non-matched user can't read another's phone). Cleans up.
//
//   node scripts/test-feed-match.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASS = "testpass123!";
let fail = false;
const ok = (c, m) => {
  console.log(`${c ? "✓" : "✗"} ${m}`);
  if (!c) fail = true;
};

const created = [];

async function makeUser(phone, email, name, country, category, blurb) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASS,
    phone,
    email_confirm: true,
    phone_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const user = data.user;
  created.push(user.id);

  const client = createClient(URL, PUB, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PASS });
  if (sErr) throw new Error(`signIn ${email}: ${sErr.message}`);

  const handle = name.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.random().toString(36).slice(2, 5);
  let r = await client.from("profiles").insert({
    id: user.id, handle, name, country, category, blurb,
    last_active_at: new Date().toISOString(),
  });
  if (r.error) throw new Error(`profile ${email}: ${r.error.message}`);
  r = await client.from("contacts").insert({ user_id: user.id, phone, verified: true });
  if (r.error) throw new Error(`contact ${email}: ${r.error.message}`);
  return { user, client };
}

try {
  const A = await makeUser("+254700000001", "a@test.com", "Aisha Test", "Kenya", "Business", "Fresh produce, Ruaka.");
  const B = await makeUser("+254700000002", "b@test.com", "Brian Test", "Kenya", "Reseller", "Phones & accessories.");
  ok(true, "created two verified test users (A, B)");

  let { data: feedA } = await A.client.rpc("feed", { p_limit: 30 });
  const bInFeed = (feedA ?? []).find((x) => x.id === B.user.id);
  ok(!!bInFeed, "A.feed() includes B");
  ok(bInFeed && !("phone" in bInFeed), "feed rows carry NO phone field");

  let { data: cBefore } = await A.client
    .from("contacts").select("phone").eq("user_id", B.user.id).maybeSingle();
  ok(cBefore == null, "CONSENT GATE: A cannot read B's phone before a match");

  let r = await A.client.from("saves").insert({ from_user: A.user.id, to_user: B.user.id });
  ok(!r.error, `A saves B ${r.error?.message ?? ""}`);
  let { data: m1 } = await A.client.rpc("is_matched", { target: B.user.id });
  ok(!m1, "not matched after a one-way save");

  r = await B.client.from("saves").insert({ from_user: B.user.id, to_user: A.user.id });
  ok(!r.error, `B saves A ${r.error?.message ?? ""}`);
  let { data: m2 } = await A.client.rpc("is_matched", { target: B.user.id });
  ok(!!m2, "mutual save → match created by the DB trigger");

  let { data: cAfter } = await A.client
    .from("contacts").select("phone").eq("user_id", B.user.id).maybeSingle();
  ok(cAfter?.phone === "+254700000002", `CONSENT GATE opens on match: A reads B's phone (${cAfter?.phone ?? "null"})`);

  ({ data: feedA } = await A.client.rpc("feed", { p_limit: 30 }));
  ok(!(feedA ?? []).some((x) => x.id === B.user.id), "matched user is excluded from the feed");
} catch (e) {
  ok(false, `threw: ${e.message}`);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`(cleaned up ${created.length} test users)`);
}

console.log(
  fail
    ? "\n✗ FEED / MATCH / CONSENT-GATE checks FAILED"
    : "\n✓ feed ranking, save→match trigger, and the consent gate all work",
);
process.exit(fail ? 1 : 0);
