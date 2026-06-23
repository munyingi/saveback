"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { adminBan, adminUnban, adminPromote } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/admin";

export function AdminUsers({
  initialUsers,
  query,
}: {
  initialUsers: AdminUser[];
  query: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/admin?q=${encodeURIComponent(q.trim())}` : "/admin");
  }

  function act(id: string, fn: () => Promise<void>, patch: Partial<AdminUser>) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await fn();
        setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      } catch {
        /* ignore in UI; action throws are server-validated */
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      <form onSubmit={search} className="inp" style={{ marginBottom: 14 }}>
        <Search />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, handle, country"
        />
      </form>

      {users.length === 0 && (
        <p className="admin-sub" style={{ margin: 0 }}>
          No users match.
        </p>
      )}

      {users.map((u) => (
        <div className="urow" key={u.id}>
          <div className="uinfo">
            <b>
              {u.name}
              {u.is_admin && <span className="badge-admin">admin</span>}
              {u.banned && <span className="badge-banned">banned</span>}
            </b>
            <small>
              {u.country} · {u.category}
              {u.handle ? ` · /u/${u.handle}` : ""}
              {u.boostedNow ? " · favored" : ""}
            </small>
          </div>
          <div className="acts">
            <button
              className="abtn boost"
              disabled={busyId === u.id || u.banned}
              onClick={() =>
                act(u.id, () => adminPromote(u.id), { boostedNow: true })
              }
            >
              Promote
            </button>
            {u.banned ? (
              <button
                className="abtn"
                disabled={busyId === u.id}
                onClick={() => act(u.id, () => adminUnban(u.id), { banned: false })}
              >
                Unban
              </button>
            ) : (
              <button
                className="abtn ban"
                disabled={busyId === u.id || u.is_admin}
                onClick={() => act(u.id, () => adminBan(u.id), { banned: true })}
              >
                Ban
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
