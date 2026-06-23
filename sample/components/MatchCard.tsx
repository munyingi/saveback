// components/MatchCard.tsx
"use client";

import { useState } from "react";
import { saveForSaveLink, prettyPhone, toDigits } from "@/lib/whatsapp";

type Match = {
  id: string;
  name: string;
  country: string;
  category: string;
  phone: string | null; // null only if RLS withheld it (i.e. not actually matched)
};

export function MatchCard({ match, myName }: { match: Match; myName: string }) {
  const [copied, setCopied] = useState(false);
  const phone = match.phone;

  async function copy() {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText("+" + toDigits(phone));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked in some webviews; ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{match.name}</h4>
        <span className="text-xs font-semibold text-emerald-600">matched</span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {match.country} · {match.category}
      </p>

      {phone ? (
        <>
          <div className="mt-3 border-t border-dashed border-neutral-200 pt-3 text-lg font-semibold tracking-tight">
            {prettyPhone(phone)}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={copy}
              className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={saveForSaveLink(phone, myName, match.name)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white"
            >
              Save me back on WhatsApp
            </a>
          </div>
        </>
      ) : (
        // Should not happen for a real match, but never assume the number is there.
        <p className="mt-3 text-sm text-neutral-500">
          Number unlocks once you both save.
        </p>
      )}
    </div>
  );
}
