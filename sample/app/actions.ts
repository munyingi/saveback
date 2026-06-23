// app/actions.ts
"use server";

// Assumes the standard Supabase Next.js server client at lib/supabase/server.
// RLS does the real enforcement; these actions just call it cleanly.
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

/**
 * Save someone (save-for-save). If they already saved you, the DB trigger
 * creates the match. Returns whether you are now matched.
 */
export async function saveForSave(targetId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("saves")
    .insert({ to_user: targetId }); // from_user is forced to auth.uid() by RLS
  // 23505 = unique violation (already saved). Ignore it.
  if (error && error.code !== "23505") throw error;

  const { data: matched } = await supabase.rpc("is_matched", { target: targetId });
  return { matched: Boolean(matched) };
}

/** Ranked discovery feed. Never includes phone numbers. */
export async function getFeed(limit = 30) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("feed", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** People who saved me first and I have not matched yet. */
export async function getRequests() {
  const { supabase, user } = await requireUser();
  // saves where to_user = me, and no match exists yet
  const { data: incoming } = await supabase
    .from("saves")
    .select("from_user")
    .eq("to_user", user.id);
  const fromIds = (incoming ?? []).map((r) => r.from_user);
  if (fromIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, country, category, blurb")
    .in("id", fromIds);

  // Filter out ones already matched (those belong in Matches).
  const result = [];
  for (const p of profiles ?? []) {
    const { data: m } = await supabase.rpc("is_matched", { target: p.id });
    if (!m) result.push(p);
  }
  return result;
}

/**
 * Mutual matches, with the phone attached. The contacts read only succeeds
 * because RLS allows it once a match row exists. No match, no number.
 */
export async function getMatches() {
  const { supabase, user } = await requireUser();
  const { data: rows } = await supabase
    .from("matches")
    .select("user_a, user_b, created_at")
    .order("created_at", { ascending: false });

  const otherIds = (rows ?? []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));
  if (otherIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, country, category")
    .in("id", otherIds);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("user_id, phone")
    .in("user_id", otherIds);

  const phoneById = Object.fromEntries((contacts ?? []).map((c) => [c.user_id, c.phone]));
  return (profiles ?? []).map((p) => ({ ...p, phone: phoneById[p.id] ?? null }));
}

export async function blockUser(targetId: string) {
  const { supabase } = await requireUser();
  await supabase.from("blocks").insert({ blocked: targetId }); // blocker forced to auth.uid()
}

export async function reportUser(targetId: string, reason?: string) {
  const { supabase } = await requireUser();
  await supabase.from("reports").insert({ reported: targetId, reason }); // reporter forced to auth.uid()
}

// NOTE: requireUser() should also reject banned users. After getUser(), call the
// is_banned() RPC and sign the user out / throw if true, so a banned account
// cannot act even if a session lingers:
//
//   const { data: banned } = await supabase.rpc("is_banned");
//   if (banned) { await supabase.auth.signOut(); throw new Error("Account banned"); }
//
// Actual banning (writing to `bans` and `banned_identifiers`) and the signup-time
// denylist check both run on your moderation backend with the Supabase SERVICE ROLE,
// never from client code. Hash phone/email with a server-side salt before comparing.
