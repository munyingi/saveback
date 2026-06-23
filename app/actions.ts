"use server";

// Server actions. RLS does the real enforcement; these call it cleanly and
// re-check the verified-phone + verified-email + not-banned gate server-side.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isIdentifierBanned } from "@/lib/moderation";
import { COUNTRIES, CATEGORIES } from "@/lib/constants";

// Anti-spam: free-tier daily save cap (§9, §14), server-enforced.
const DAILY_SAVE_CAP = 50;

async function requireVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // A banned account cannot act, even with a lingering session.
  const { data: banned } = await supabase.rpc("is_banned");
  if (banned) {
    await supabase.auth.signOut();
    throw new Error("Account banned");
  }

  if (!user.phone_confirmed_at || !user.email_confirmed_at) {
    throw new Error("Verify your phone and email first.");
  }
  return { supabase, user };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "user"
  );
}

/**
 * Save the public profile (profiles) and the verified phone (contacts). Email
 * is never written here — it stays in Supabase Auth only.
 */
export async function completeOnboarding(input: {
  name: string;
  country: string;
  category: string;
  blurb: string;
}) {
  const { supabase, user } = await requireVerifiedUser();

  // Registration denylist: a previously-banned phone/email can't re-register.
  if (await isIdentifierBanned(user.phone ?? null, user.email ?? null)) {
    await supabase.auth.signOut();
    throw new Error("This number or email can't be used to register.");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const country = (COUNTRIES as readonly string[]).includes(input.country)
    ? input.country
    : "Kenya";
  const category = (CATEGORIES as readonly string[]).includes(input.category)
    ? input.category
    : "Business";
  const blurb = input.blurb.trim().slice(0, 160) || "Save for save 🙏";

  // Pick a free handle for /u/[handle].
  let handle = slugify(name);
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (taken && taken.id !== user.id) {
    handle = `${handle}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error: pErr } = await supabase.from("profiles").upsert({
    id: user.id,
    handle,
    name,
    country,
    category,
    blurb,
    last_active_at: new Date().toISOString(),
  });
  if (pErr) throw pErr;

  // The verified auth phone is the contact number. RLS only lets you write your
  // own contact row; it's readable by others only after a mutual match.
  const phone = user.phone
    ? user.phone.startsWith("+")
      ? user.phone
      : "+" + user.phone
    : null;
  if (phone) {
    const { error: cErr } = await supabase
      .from("contacts")
      .upsert({ user_id: user.id, phone, verified: true });
    if (cErr) throw cErr;
  }

  revalidatePath("/discover");
  revalidatePath("/onboarding");
}

/**
 * Save someone (save-for-save). from_user is the signed-in user; to_user is the
 * target. If they already saved you, the DB trigger creates the match. Returns
 * whether you are now matched.
 */
export async function saveForSave(targetId: string) {
  const { supabase, user } = await requireVerifiedUser();
  if (targetId === user.id) throw new Error("You can't save yourself.");

  // Daily save cap — deters spammy mass-saving (§9).
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("saves")
    .select("*", { count: "exact", head: true })
    .eq("from_user", user.id)
    .gte("created_at", startOfDay.toISOString());
  if ((count ?? 0) >= DAILY_SAVE_CAP) {
    throw new Error(
      `Daily save limit reached (${DAILY_SAVE_CAP} per day). This keeps SaveBack free of spam. Please try again tomorrow.`,
    );
  }

  const { error } = await supabase
    .from("saves")
    .insert({ from_user: user.id, to_user: targetId });
  // 23505 = unique violation (already saved). Treat as success.
  if (error && error.code !== "23505") throw error;

  const { data: matched } = await supabase.rpc("is_matched", {
    target: targetId,
  });

  revalidatePath("/discover");
  revalidatePath("/requests");
  revalidatePath("/matches");
  return { matched: Boolean(matched) };
}

/** File a moderation report (does not hide anyone by itself). */
export async function reportUser(targetId: string, reason?: string) {
  const { supabase, user } = await requireVerifiedUser();
  const { error } = await supabase
    .from("reports")
    .insert({ reporter: user.id, reported: targetId, reason: reason ?? null });
  if (error) throw error;
}

/** Block a user — hides the two of you from each other's feed (self-serve). */
export async function blockUser(targetId: string) {
  const { supabase, user } = await requireVerifiedUser();
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker: user.id, blocked: targetId });
  if (error && error.code !== "23505") throw error;
  revalidatePath("/discover");
  revalidatePath("/requests");
}

/**
 * Free 1-hour boost. Goes through the single activate_boost() path so paid/admin
 * sources reuse it later. Run with the SERVICE ROLE server-side (per the brief:
 * all boost writes are service-role only) and forced to the caller's own id +
 * fixed minutes/source, so a client can't boost someone else or fake a paid one.
 */
export async function activateBoost() {
  const { user } = await requireVerifiedUser();
  const admin = createAdminClient();

  const { error } = await admin.rpc("activate_boost", {
    p_user: user.id,
    p_minutes: 60,
    p_source: "free",
  });
  if (error) throw error;

  const { data } = await admin
    .from("profiles")
    .select("boost_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/discover");
  revalidatePath("/you");
  return { boostEndsAt: data?.boost_ends_at as string };
}

/** Lightweight heartbeat — keeps reputation() timing fair. */
export async function touchLastActive() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id);
}

/**
 * Permanently delete the signed-in user's own account. Removes the auth.users
 * row with the service role, which cascades to the profile and every row keyed
 * on it (contacts, saves, matches, blocks, reports, bans, boosts, payments).
 * This is irreversible. The caller must re-type the confirmation word, which we
 * re-check here so a stray call can never trigger it. A voluntary deletion is
 * not a ban, so we do NOT add the person to the signup denylist — they may
 * register again later.
 */
export async function deleteMyAccount(confirmation: string) {
  if (confirmation !== "DELETE") {
    throw new Error("Type DELETE to confirm.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const userId = user.id;

  // Clear the session cookie first, while the token is still valid, so the
  // browser ends up cleanly signed out regardless of what happens next.
  await supabase.auth.signOut();

  // Then remove the account itself with the service role (independent of the
  // now-cleared session). Deleting the auth user cascades to all of their data.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error("Couldn't delete your account. Please try again.");
  }
}
