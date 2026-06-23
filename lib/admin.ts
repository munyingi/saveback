import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin reads use the SERVICE ROLE (bypasses RLS for cross-user views). The
// service-role key is server-only and never reaches the browser. Gate every
// admin surface on profiles.is_admin via isCallerAdmin().

export async function isCallerAdmin(): Promise<boolean> {
  const supabase = await createClient(); // caller's own session, RLS-bound
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

export async function getAdminOverview() {
  const admin = createAdminClient();
  const now = Date.now();
  const dayAgo = new Date(now - 864e5).toISOString();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const nowIso = new Date(now).toISOString();
  const head = (t: string) => admin.from(t).select("*", { count: "exact", head: true });

  const [signups, dau, wau, saves, matches, openReports, bans, liveBoosts] =
    await Promise.all([
      head("profiles"),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", dayAgo),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", weekAgo),
      head("saves"),
      head("matches"),
      admin.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      head("bans"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("boosted", true).gt("boost_ends_at", nowIso),
    ]);

  return {
    signups: signups.count ?? 0,
    dau: dau.count ?? 0,
    wau: wau.count ?? 0,
    saves: saves.count ?? 0,
    matches: matches.count ?? 0,
    openReports: openReports.count ?? 0,
    bans: bans.count ?? 0,
    liveBoosts: liveBoosts.count ?? 0,
  };
}

export type AdminUser = {
  id: string;
  name: string;
  handle: string | null;
  country: string;
  category: string;
  is_admin: boolean;
  created_at: string;
  banned: boolean;
  boostedNow: boolean;
};

export async function getAdminUsers(query?: string): Promise<AdminUser[]> {
  const admin = createAdminClient();
  let q = admin
    .from("profiles")
    .select("id, name, handle, country, category, is_admin, boosted, boost_ends_at, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  if (query?.trim()) {
    const s = query.trim();
    q = q.or(`name.ilike.%${s}%,handle.ilike.%${s}%,country.ilike.%${s}%`);
  }
  const { data: profiles } = await q;
  const { data: bans } = await admin.from("bans").select("user_id");
  const banned = new Set((bans ?? []).map((b) => b.user_id));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    country: p.country,
    category: p.category,
    is_admin: p.is_admin,
    created_at: p.created_at,
    banned: banned.has(p.id),
    boostedNow:
      p.boosted && !!p.boost_ends_at && new Date(p.boost_ends_at) > new Date(),
  }));
}

export async function getAdminReports() {
  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("id, reporter, reported, reason, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  const ids = [...new Set((reports ?? []).flatMap((r) => [r.reporter, r.reported]))];
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, name").in("id", ids)
    : { data: [] as { id: string; name: string }[] };
  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));

  return (reports ?? []).map((r) => ({
    id: r.id as string,
    reason: (r.reason as string) ?? "—",
    created_at: r.created_at as string,
    reporter: r.reporter as string,
    reported: r.reported as string,
    reporterName: nameById[r.reporter] ?? "—",
    reportedName: nameById[r.reported] ?? "—",
  }));
}

export async function getLeaderboards() {
  const admin = createAdminClient();
  const [{ data: saves }, { data: matches }] = await Promise.all([
    admin.from("saves").select("from_user"),
    admin.from("matches").select("user_a, user_b"),
  ]);

  const saveCount: Record<string, number> = {};
  (saves ?? []).forEach((s) => {
    saveCount[s.from_user] = (saveCount[s.from_user] ?? 0) + 1;
  });
  const matchCount: Record<string, number> = {};
  (matches ?? []).forEach((m) => {
    matchCount[m.user_a] = (matchCount[m.user_a] ?? 0) + 1;
    matchCount[m.user_b] = (matchCount[m.user_b] ?? 0) + 1;
  });

  const top = (rec: Record<string, number>) =>
    Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topSavers = top(saveCount);
  const topMatched = top(matchCount);

  const ids = [...new Set([...topSavers, ...topMatched].map((x) => x[0]))];
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, name, country, category").in("id", ids)
    : { data: [] as { id: string; name: string; country: string; category: string }[] };
  const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return {
    topSavers: topSavers
      .filter(([id]) => byId[id])
      .map(([id, count]) => ({ ...byId[id], count })),
    topMatched: topMatched
      .filter(([id]) => byId[id])
      .map(([id, count]) => ({ ...byId[id], count })),
  };
}
