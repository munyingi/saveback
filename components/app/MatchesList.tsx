"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Heart } from "lucide-react";
import { avatarColor, flagFor } from "@/lib/constants";
import { prettyPhone, toDigits, saveForSaveLink } from "@/lib/whatsapp";
import type { Match } from "@/lib/matches";

export function MatchesList({
  matches,
  myName,
}: {
  matches: Match[];
  myName: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(m: Match) {
    if (!m.phone) return;
    try {
      await navigator.clipboard.writeText("+" + toDigits(m.phone));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard may be blocked in some webviews; ignore */
    }
  }

  if (matches.length === 0) {
    return (
      <div className="empty">
        <div className="ic">
          <Heart />
        </div>
        <h3>No matches yet</h3>
        <p>
          Save people in Discover. When they save you back, their number appears
          here.
        </p>
      </div>
    );
  }

  return (
    <>
      {matches.map((m) => (
        <div key={m.id} className="card reveal">
          <div className="crow">
            <div className="av" style={{ background: avatarColor(m.name) }}>
              {m.name[0]?.toUpperCase()}
            </div>
            <div className="who">
              <h4>
                {m.name}{" "}
                <span className="matchflag">
                  <Check /> matched
                </span>
              </h4>
              <div className="tags">
                <span className="tag">
                  {flagFor(m.country)} {m.country}
                </span>
                <span className="tag">{m.category}</span>
              </div>
            </div>
          </div>

          {m.phone ? (
            <>
              <div className="numrow">
                <div className="num">{prettyPhone(m.phone)}</div>
              </div>
              <div className="matched-actions">
                <button className="btn btn-copy" onClick={() => copy(m)}>
                  <Copy /> {copiedId === m.id ? "Copied" : "Copy"}
                </button>
                <a
                  className="btn btn-wa"
                  href={saveForSaveLink(m.phone, myName, m.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Save me back on WhatsApp
                </a>
              </div>
            </>
          ) : (
            <p className="blurb">Their number unlocks once you both save.</p>
          )}
        </div>
      ))}
    </>
  );
}
