import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Reputation } from "@/lib/feed";

/** The signed-in user's own reputation (save-back score). */
export async function getMyReputation(): Promise<Reputation | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("reputation", { target: user.id });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    rate: row?.saves_back_rate != null ? Number(row.saves_back_rate) : null,
    sample: row?.sample ?? 0,
    label: (row?.label ?? "New") as Reputation["label"],
  };
}
