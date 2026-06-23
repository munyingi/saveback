"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, ChevronDown, ArrowLeft, Check } from "lucide-react";
import { CountryPicker } from "@/components/CountryPicker";

export function GlobeSwitcher() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = params.get("country"); // null => Everywhere (cross-country)

  function pick(country: string) {
    setOpen(false);
    router.push(`/discover?country=${encodeURIComponent(country)}`);
  }
  function everywhere() {
    setOpen(false);
    router.push("/discover");
  }

  return (
    <>
      <button className="globebtn" onClick={() => setOpen(true)}>
        <Globe /> {active ?? "Everywhere"} <ChevronDown className="chev" />
      </button>

      {open && (
        <div className="picker">
          <div className="picker-hd">
            <button className="back" onClick={() => setOpen(false)}>
              <ArrowLeft /> Close
            </button>
            <b>Browse</b>
          </div>
          <p className="picker-sub">
            Your feed already leads with your own country, then everyone. Pick a
            country to narrow it.
          </p>
          <button
            type="button"
            className={"picker-row" + (!active ? " on" : "")}
            onClick={everywhere}
            style={{ marginBottom: 9 }}
          >
            <span className="fl">🌍</span>
            <span className="nm">Everywhere</span>
            {!active && <Check />}
          </button>
          <CountryPicker
            selected={active ?? undefined}
            showFlags={false}
            onPick={pick}
          />
        </div>
      )}
    </>
  );
}
