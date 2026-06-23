// Validates self-serve account deletion against the LOCAL stack:
//   1. Deleting a user removes their profile + contact + saves + matches
//      (cascade from auth.users), leaving no orphan rows, and not touching the
//      OTHER party in a match.
//   2. A voluntary deletion does NOT add the person to the signup denylist.
//   3. Deleting an admin who had issued a ban / granted a boost succeeds, and
//      those audit rows survive with the actor column set to NULL (the
//      20260623000006 migration: ON DELETE SET NULL).

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
const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hashId = (kind, value) =>
  createHash("sha256")
    .update(
      `${SALT}:${kind}:${
        kind === "email" ? value.trim().toLowerCase() : value.replace(/[^\d]/g, "")
      }`,
    )
    .digest("hex");

let fail = false;
const ok = (c, m) => {
  console.log(`${c ? "✓" : "✗"} ${m}`);
  if (!c) fail = true;
};
const created = [];

async function makeUser(phone, email, name) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "testpass123!",
    phone,
    email_confirm: true,
    phone_confirm: true,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  const id = data.user.id;
  created.push(id);
  const handle = name.toLowerCase() + Math.random().toString(36).slice(2, 5);
  await admin.from("profiles").insert({
    id,
    handle,
    name,
    country: "Kenya",
    category: "Business",
    last_active_at: new Date().toISOString(),
  });
  await admin.from("contacts").insert({ user_id: id, phone, verified: true });
  return { id, phone, email };
}

const count = async (table, col, id) =>
  (await admin.from(table).select("*", { count: "exact", head: true }).eq(col, id))
    .count ?? 0;

try {
  // ---- 1. Normal deletion: cascade + match counterpart untouched -----------
  const A = await makeUser("+254700000001", "a@del.test", "Aisha");
  const B = await makeUser("+254700000002", "b@del.test", "Brian");

  // A saves B and B saves A → the trigger creates a match between them.
  await admin.from("saves").insert({ from_user: A.id, to_user: B.id });
  await admin.from("saves").insert({ from_user: B.id, to_user: A.id });
  ok(true, "set up A and B with a mutual save (match)");

  const matchesBefore =
    (await admin.from("matches").select("*", { count: "exact", head: true })).count ?? 0;
  ok(matchesBefore >= 1, "a match row exists before deletion");

  // Delete A — exactly what the server action does after signing the user out.
  const { error: delErr } = await admin.auth.admin.deleteUser(A.id);
  ok(!delErr, `deleteUser(A) succeeded${delErr ? ": " + delErr.message : ""}`);

  ok((await count("profiles", "id", A.id)) === 0, "A's profile is gone");
  ok((await count("contacts", "user_id", A.id)) === 0, "A's contact is gone");
  ok(
    (await count("saves", "from_user", A.id)) === 0 &&
      (await count("saves", "to_user", A.id)) === 0,
    "every save touching A is gone (both directions)",
  );
  ok(
    (await count("matches", "user_a", A.id)) === 0 &&
      (await count("matches", "user_b", A.id)) === 0,
    "the match row is gone",
  );
  ok((await count("profiles", "id", B.id)) === 1, "B's profile is untouched");

  // 2. voluntary deletion must NOT add A to the signup denylist
  const dl = await admin
    .from("banned_identifiers")
    .select("id")
    .eq("id_hash", hashId("phone", A.phone));
  ok((dl.data?.length ?? 0) === 0, "A is NOT on the signup denylist (free to rejoin)");

  // ---- 3. Admin deletion: ban/boost audit rows survive with NULL actor -----
  const X = await makeUser("+254700000003", "x@del.test", "Xena"); // admin actor
  const Y = await makeUser("+254700000004", "y@del.test", "Yusuf"); // target

  await admin.from("bans").insert({ user_id: Y.id, reason: "test", banned_by: X.id });
  await admin.from("boosts").insert({
    user_id: Y.id,
    source: "admin",
    ends_at: new Date(Date.now() + 3600e3).toISOString(),
    created_by: X.id,
  });
  ok(true, "X issued a ban + boost referencing X as the actor");

  const { error: delX } = await admin.auth.admin.deleteUser(X.id);
  ok(!delX, `deleteUser(admin X) succeeded${delX ? ": " + delX.message : ""}`);
  ok((await count("profiles", "id", X.id)) === 0, "X's profile is gone");

  const banRow = (await admin.from("bans").select("banned_by").eq("user_id", Y.id)).data;
  ok(
    (banRow?.length ?? 0) === 1 && banRow[0].banned_by === null,
    "Y's ban row survived with banned_by = NULL",
  );
  const boostRow = (
    await admin.from("boosts").select("created_by").eq("user_id", Y.id)
  ).data;
  ok(
    (boostRow?.length ?? 0) === 1 && boostRow[0].created_by === null,
    "Y's boost row survived with created_by = NULL",
  );
} catch (e) {
  ok(false, `threw: ${e.message}`);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(`(cleaned up ${created.length} users)`);
}

console.log(fail ? "\n✗ ACCOUNT DELETION checks FAILED" : "\n✓ account deletion: cascade, no denylist, admin SET NULL all work");
process.exit(fail ? 1 : 0);
