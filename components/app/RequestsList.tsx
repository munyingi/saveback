"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Users } from "lucide-react";
import { avatarColor, flagFor } from "@/lib/constants";
import { saveForSave } from "@/app/actions";
import type { SaveRequest } from "@/lib/requests";

export function RequestsList({ requests }: { requests: SaveRequest[] }) {
  const router = useRouter();
  const [list, setList] = useState(requests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function saveBack(p: SaveRequest) {
    setBusyId(p.id);
    startTransition(async () => {
      try {
        // They already saved me, so this reciprocal save creates the match.
        await saveForSave(p.id);
        setList((l) => l.filter((x) => x.id !== p.id));
        flash(`You matched with ${p.name.split(" ")[0]}. Their number is in Matches.`);
        router.refresh(); // update the Requests badge in the shell
      } catch (e) {
        flash(e instanceof Error ? e.message : "Couldn't save back. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function skip(p: SaveRequest) {
    setList((l) => l.filter((x) => x.id !== p.id));
  }

  if (list.length === 0) {
    return (
      <div className="empty">
        <div className="ic">
          <Users />
        </div>
        <h3>No requests yet</h3>
        <p>
          When someone saves you first, they appear here. Save them back to
          unlock both numbers.
        </p>
      </div>
    );
  }

  return (
    <>
      {list.map((p) => (
        <div key={p.id} className="card">
          <div className="crow">
            <div className="av" style={{ background: avatarColor(p.name) }}>
              {p.name[0]?.toUpperCase()}
            </div>
            <div className="who">
              <h4>{p.name}</h4>
              <div className="tags">
                <span className="tag">
                  {flagFor(p.country)} {p.country}
                </span>
                <span className="tag">{p.category}</span>
                <span className="matchflag">
                  <Heart /> saved you
                </span>
              </div>
            </div>
          </div>

          {p.blurb && <p className="blurb">{p.blurb}</p>}

          <div className="matched-actions">
            <button
              className="btn btn-save"
              style={{ flex: 1 }}
              onClick={() => saveBack(p)}
              disabled={busyId === p.id}
            >
              <Check /> {busyId === p.id ? "Saving…" : "Save back"}
            </button>
            <button className="btn btn-ghost" onClick={() => skip(p)}>
              Skip
            </button>
          </div>
        </div>
      ))}

      {toast && (
        <div className="toast">
          <Check /> {toast}
        </div>
      )}
    </>
  );
}
