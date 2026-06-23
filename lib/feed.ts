import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Reputation = {
  rate: number | null;
  sample: number;
  label: "New" | "Reliable" | "OK" | "Low";
};

export type FeedItem = {
  id: string;
  name: string;
  country: string;
  category: string;
  blurb: string | null;
  boosted: boolean;
  saved_by_me: boolean;
  reputation: Reputation;
};

/**
 * Ranked discovery feed via the feed() RPC (boosted, then country+category,
 * country, category, rest — random within tiers; excludes self/blocked/matched/
 * banned). Never returns a phone number. Reputation is attached per card.
 */
export async function getFeed(
  country?: string,
  limit = 30,
): Promise<FeedItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("feed", {
    p_limit: limit,
    p_country: country ?? null,
  });
  if (error) throw error;
  const items = (data ?? []) as Omit<FeedItem, "reputation">[];

  const reps = await Promise.all(
    items.map(async (p) => {
      const { data: r } = await supabase.rpc("reputation", { target: p.id });
      const row = Array.isArray(r) ? r[0] : r;
      return {
        rate:
          row?.saves_back_rate != null ? Number(row.saves_back_rate) : null,
        sample: row?.sample ?? 0,
        label: (row?.label ?? "New") as Reputation["label"],
      } satisfies Reputation;
    }),
  );

  return items.map((p, i) => ({ ...p, reputation: reps[i] }));
}
