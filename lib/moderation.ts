import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Moderation backend. EVERYTHING here uses the service role and runs server-side
// only — never from client code. Identifiers are stored as salted hashes, never
// raw (Kenya DPA 2019: minimal retention of personal data).

const SALT = process.env.BAN_HASH_SALT ?? "";

function normalize(kind: "phone" | "email", value: string): string {
  return kind === "email"
    ? value.trim().toLowerCase()
    : value.replace(/[^\d]/g, "");
}

export function hashIdentifier(kind: "phone" | "email", value: string): string {
  return createHash("sha256")
    .update(`${SALT}:${kind}:${normalize(kind, value)}`)
    .digest("hex");
}

/**
 * Registration denylist: has this phone or email been banned before? Checked at
 * signup so a banned person can't quietly re-register with the same identifiers.
 */
export async function isIdentifierBanned(
  phone: string | null,
  email: string | null,
): Promise<boolean> {
  if (!SALT) return false; // not configured (dev) -> don't block
  const admin = createAdminClient();
  const hashes: string[] = [];
  if (phone) hashes.push(hashIdentifier("phone", phone));
  if (email) hashes.push(hashIdentifier("email", email));
  if (hashes.length === 0) return false;

  const { data } = await admin
    .from("banned_identifiers")
    .select("id")
    .in("id_hash", hashes)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/**
 * Ban a user: cut the account off (bans row) AND add salted hashes of their
 * verified phone + email to the denylist so they can't re-register.
 */
export async function banUser(
  userId: string,
  reason: string | null,
  adminId: string | null,
) {
  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const phone = u?.user?.phone ?? null;
  const email = u?.user?.email ?? null;

  await admin
    .from("bans")
    .upsert({ user_id: userId, reason, banned_by: adminId });

  const rows: { kind: string; id_hash: string }[] = [];
  if (phone) rows.push({ kind: "phone", id_hash: hashIdentifier("phone", phone) });
  if (email) rows.push({ kind: "email", id_hash: hashIdentifier("email", email) });
  if (rows.length) {
    await admin
      .from("banned_identifiers")
      .upsert(rows, { onConflict: "kind,id_hash", ignoreDuplicates: true });
  }
}

/** Lift a ban and remove the user's denylist hashes (full restore). */
export async function unbanUser(userId: string) {
  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const phone = u?.user?.phone ?? null;
  const email = u?.user?.email ?? null;

  await admin.from("bans").delete().eq("user_id", userId);

  const hashes: string[] = [];
  if (phone) hashes.push(hashIdentifier("phone", phone));
  if (email) hashes.push(hashIdentifier("email", email));
  if (hashes.length) {
    await admin.from("banned_identifiers").delete().in("id_hash", hashes);
  }
}
