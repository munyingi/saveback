import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Match = {
  id: string;
  name: string;
  country: string;
  category: string;
  phone: string | null; // null only if RLS withheld it (shouldn't happen for a real match)
};

/**
 * Mutual matches, newest first, with the phone attached. The contacts read only
 * succeeds because RLS allows it once a match row exists. No match, no number.
 */
export async function getMatches(): Promise<Match[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("matches")
    .select("user_a, user_b, created_at")
    .order("created_at", { ascending: false });

  const otherIds = (rows ?? []).map((r) =>
    r.user_a === user.id ? r.user_b : r.user_a,
  );
  if (otherIds.length === 0) return [];

  const [{ data: profiles }, { data: contacts }] = await Promise.all([
    supabase.from("profiles").select("id, name, country, category").in("id", otherIds),
    supabase.from("contacts").select("user_id, phone").in("user_id", otherIds),
  ]);

  const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const phoneById = Object.fromEntries(
    (contacts ?? []).map((c) => [c.user_id, c.phone as string]),
  );

  // Preserve match recency order.
  return otherIds
    .filter((id) => byId[id])
    .map((id) => ({ ...byId[id], phone: phoneById[id] ?? null }));
}
