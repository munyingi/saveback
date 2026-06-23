"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { COUNTRIES, dialOf, flagOf } from "@/lib/constants";

export function CountryPicker({
  selected,
  onPick,
  showFlags = true,
}: {
  selected?: string;
  onPick: (country: string) => void;
  showFlags?: boolean;
}) {
  const [q, setQ] = useState("");
  const list = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div className="inp" style={{ marginBottom: 12, flex: "0 0 auto" }}>
        <Search />
        <input
          placeholder="Search country"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="picker-list">
        {list.map((c) => (
          <button
            key={c}
            type="button"
            className={"picker-row" + (selected === c ? " on" : "")}
            onClick={() => onPick(c)}
          >
            {showFlags && <span className="fl">{flagOf(c)}</span>}
            <span className="nm">{c}</span>
            <span className="pdial">+{dialOf(c)}</span>
            {selected === c && <Check />}
          </button>
        ))}
        {list.length === 0 && (
          <p className="note" style={{ textAlign: "left" }}>
            No country matches that search.
          </p>
        )}
      </div>
    </div>
  );
}
