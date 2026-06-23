import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Reputation } from "@/lib/feed";

export type Profile = {
  id: string;
  handle: string | null;
  name: string;
  country: string;
  category: string;
  blurb: string | null;
  boosted: boolean;
  boost_ends_at: string | null;
  founding_member: boolean;
  is_admin: boolean;
  last_active_at: string | null;
  created_at: string;
};

/** The signed-in user's own profile row, or null if they haven't onboarded. */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
}

export type PublicProfile = {
  id: string;
  name: string;
  country: string;
  category: string;
  blurb: string | null;
  boosted: boolean;
  reputation: Reputation;
};

/** Public invite profile by handle (no phone). Works for anonymous visitors. */
export async function getPublicProfile(
  handle: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_profile", { p_handle: handle });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const { data: r } = await supabase.rpc("reputation", { target: row.id });
  const rep = Array.isArray(r) ? r[0] : r;
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    category: row.category,
    blurb: row.blurb,
    boosted: row.boosted,
    reputation: {
      rate: rep?.saves_back_rate != null ? Number(rep.saves_back_rate) : null,
      sample: rep?.sample ?? 0,
      label: (rep?.label ?? "New") as Reputation["label"],
    },
  };
}

