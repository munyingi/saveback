"use client";

import { X, Flag, Ban } from "lucide-react";

export function SafetySheet({
  name,
  onReport,
  onBlock,
  onClose,
  busy,
}: {
  name: string;
  onReport: () => void;
  onBlock: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const first = name.split(" ")[0];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button
          className="iconbtn"
          style={{ position: "static", marginLeft: "auto" }}
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>
        <h3 className="sheet-h">{name}</h3>
        <p className="sheet-sub">
          Report sends this to our moderation team. A report on its own does not
          hide anyone. Block removes the two of you from each other&apos;s feed,
          with no notification sent.
        </p>
        <button
          className="btn btn-ghost"
          style={{ width: "100%", marginBottom: 10 }}
          onClick={onReport}
          disabled={busy}
        >
          <Flag /> Report {first}
        </button>
        <button
          className="signout"
          style={{ marginTop: 0 }}
          onClick={onBlock}
          disabled={busy}
        >
          <Ban /> Block {first}
        </button>
      </div>
    </div>
  );
}
