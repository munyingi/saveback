import Link from "next/link";
import {
  getAdminOverview,
  getAdminUsers,
  getAdminReports,
  getLeaderboards,
} from "@/lib/admin";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminReports } from "@/components/admin/AdminReports";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [overview, users, reports, lb] = await Promise.all([
    getAdminOverview(),
    getAdminUsers(q),
    getAdminReports(),
    getLeaderboards(),
  ]);

  const stats: [string, number][] = [
    ["Signups", overview.signups],
    ["Active today", overview.dau],
    ["Active 7d", overview.wau],
    ["Live boosts", overview.liveBoosts],
    ["Saves", overview.saves],
    ["Matches", overview.matches],
    ["Open reports", overview.openReports],
    ["Bans", overview.bans],
  ];

  return (
    <div className="admin">
      <div className="admin-hd">
        <b>
          Save<span>Back</span> admin
        </b>
        <Link href="/discover">← Back to app</Link>
      </div>
      <p className="admin-sub">
        Service-role dashboard. Boosts, bans, and reports run server-side only.
      </p>

      <div className="stat-grid">
        {stats.map(([l, n]) => (
          <div className="stat" key={l}>
            <div className="n">{n}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Users</h3>
        <AdminUsers initialUsers={users} query={q ?? ""} />
      </div>

      <div className="panel">
        <h3>Open reports</h3>
        <AdminReports reports={reports} />
      </div>

      <div className="admin-cols">
        <div className="panel">
          <h3>Top savers</h3>
          {lb.topSavers.length ? (
            lb.topSavers.map((u, i) => (
              <div className="lb" key={u.id}>
                <span className="rank">{i + 1}</span>
                <span>
                  {u.name} · {u.country}
                </span>
                <span className="cnt">{u.count}</span>
              </div>
            ))
          ) : (
            <p className="admin-sub" style={{ margin: 0 }}>
              No saves yet.
            </p>
          )}
        </div>
        <div className="panel">
          <h3>Most matched</h3>
          {lb.topMatched.length ? (
            lb.topMatched.map((u, i) => (
              <div className="lb" key={u.id}>
                <span className="rank">{i + 1}</span>
                <span>
                  {u.name} · {u.country}
                </span>
                <span className="cnt">{u.count}</span>
              </div>
            ))
          ) : (
            <p className="admin-sub" style={{ margin: 0 }}>
              No matches yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
