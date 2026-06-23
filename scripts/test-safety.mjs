// Validates the safety layer against the LOCAL stack: banned users are excluded
// from the feed + flagged by is_banned(), their identifier hash lands in the
// denylist (re-registration block), and blocks hide users from each other.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  if (l.trim().startsWith("#")) continue;
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;
const SALT = env.BAN_HASH_SALT ?? "";
const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const hashId = (kind, value) =>
  createHash("sha256")
    .update(`${SALT}:${kind}:${kind === "email" ? value.trim().toLowerCase() : value.replace(/[^\d]/g, "")}`)
    .digest("hex");

let fail = false;
const ok = (c, m) => {
  console.log(`${c ? "✓" : "✗"} ${m}`);
  if (!c) fail = true;
};
const created = [];

async function makeUser(phone, email, name) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: "testpass123!", phone, email_confirm: true, phone_confirm: true });
  if (error) throw new Error(`${email}: ${error.message}`);
  const id = data.user.id;
  created.push(id);
  const client = createClient(URL, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.signInWithPassword({ email, password: "testpass123!" });
  const handle = name.toLowerCase() + Math.random().toString(36).slice(2, 5);
  await client.from("profiles").insert({ id, handle, name, country: "Kenya", category: "Business", last_active_at: new Date().toISOString() });
  await client.from("contacts").insert({ user_id: id, phone, verified: true });
  return { id, client, phone, email };
}

try {
  const A = await makeUser("+254700000001", "a@test.com", "Aisha");
  const B = await makeUser("+254700000002", "b@test.com", "Brian");
  const C = await makeUser("+254700000003", "c@test.com", "Carol");
  ok(true, "created A, B, C");

  const inFeed = async (who, id) => ((await who.client.rpc("feed", { p_limit: 50, p_country: "Kenya" })).data ?? []).some((x) => x.id === id);

  ok(await inFeed(A, B.id), "feed shows B before ban");

  // ban B (replicating banUser)
  await admin.from("bans").insert({ user_id: B.id, reason: "test" });
  await admin.from("banned_identifiers").upsert(
    [
      { kind: "phone", id_hash: hashId("phone", B.phone) },
      { kind: "email", id_hash: hashId("email", B.email) },
    ],
    { onConflict: "kind,id_hash", ignoreDuplicates: true },
  );

  ok(((await B.client.rpc("is_banned")).data) === true, "is_banned() true for banned B");
  ok(!(await inFeed(A, B.id)), "feed EXCLUDES banned B");

  const dl = (await admin.from("banned_identifiers").select("id").in("id_hash", [hashId("phone", B.phone)]).limit(1)).data;
  ok((dl?.length ?? 0) > 0, "denylist: B's phone hash blocks re-registration");

  // block: A blocks C
  ok(await inFeed(A, C.id), "feed shows C before block");
  await A.client.from("blocks").insert({ blocker: A.id, blocked: C.id });
  ok(!(await inFeed(A, C.id)), "feed EXCLUDES blocked C (for A)");
  ok(!(await inFeed(C, A.id)), "feed EXCLUDES A (for C) — block is mutual");
} catch (e) {
  ok(false, `threw: ${e.message}`);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`(cleaned up ${created.length} users)`);
}

console.log(fail ? "\n✗ SAFETY checks FAILED" : "\n✓ ban gate, denylist, and blocks all work");
process.exit(fail ? 1 : 0);
