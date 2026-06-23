import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Reputation } from "@/lib/feed";

export type SaveRequest = {
  id: string;
  name: string;
  country: string;
  category: string;
  blurb: string | null;
  reputation: Reputation;
};

async function pendingFromIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data: incoming } = await supabase
    .from("saves")
    .select("from_user")
    .eq("to_user", userId);
  const fromIds = (incoming ?? []).map((r) => r.from_user as string);
  if (fromIds.length === 0) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select("user_a, user_b");
  const matchedIds = new Set(
    (matches ?? []).map((m) => (m.user_a === userId ? m.user_b : m.user_a)),
  );
  return fromIds.filter((id) => !matchedIds.has(id));
}

/** People who saved me first and I haven't matched yet, with reputation. */
export async function getRequests(): Promise<SaveRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const pendingIds = await pendingFromIds(supabase, user.id);
  if (pendingIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, country, category, blurb")
    .in("id", pendingIds);

  const reps = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: r } = await supabase.rpc("reputation", { target: p.id });
      const row = Array.isArray(r) ? r[0] : r;
      return {
        rate: row?.saves_back_rate != null ? Number(row.saves_back_rate) : null,
        sample: row?.sample ?? 0,
        label: (row?.label ?? "New") as Reputation["label"],
      } satisfies Reputation;
    }),
  );

  return (profiles ?? []).map((p, i) => ({ ...p, reputation: reps[i] }));
}

/** Count of people who saved me first and aren't matched yet (the badge). */
export async function getRequestsCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  return (await pendingFromIds(supabase, user.id)).length;
}
