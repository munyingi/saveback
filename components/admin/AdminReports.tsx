"use client";

import { useState, useTransition } from "react";
import { adminResolveReport } from "@/app/admin/actions";

type Report = {
  id: string;
  reason: string;
  created_at: string;
  reporterName: string;
  reportedName: string;
};

export function AdminReports({ reports }: { reports: Report[] }) {
  const [list, setList] = useState(reports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function resolve(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await adminResolveReport(id);
        setList((l) => l.filter((r) => r.id !== id));
      } catch {
        /* ignore */
      } finally {
        setBusyId(null);
      }
    });
  }

  if (list.length === 0) {
    return (
      <p className="admin-sub" style={{ margin: 0 }}>
        No open reports.
      </p>
    );
  }

  return (
    <>
      {list.map((r) => (
        <div className="urow" key={r.id}>
          <div className="uinfo">
            <b>{r.reportedName}</b>
            <small>
              reported by {r.reporterName}
              {r.reason && r.reason !== "—" ? ` · “${r.reason}”` : ""} ·{" "}
              {r.created_at.slice(0, 10)}
            </small>
          </div>
          <div className="acts">
            <button
              className="abtn"
              disabled={busyId === r.id}
              onClick={() => resolve(r.id)}
            >
              Mark reviewed
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
