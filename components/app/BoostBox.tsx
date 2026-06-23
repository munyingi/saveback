"use client";

import { useState, useEffect, useTransition } from "react";
import { Zap } from "lucide-react";
import { activateBoost } from "@/app/actions";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}

export function BoostBox({
  boostEndsAt,
  country,
}: {
  boostEndsAt: string | null;
  country: string;
}) {
  const [ends, setEnds] = useState<number | null>(
    boostEndsAt ? new Date(boostEndsAt).getTime() : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const active = ends != null && ends > now;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  function boost() {
    startTransition(async () => {
      try {
        const { boostEndsAt: e } = await activateBoost();
        setEnds(new Date(e).getTime());
        setNow(Date.now());
      } catch {
        /* surfaced elsewhere; keep the box stable */
      }
    });
  }

  return (
    <div className="boostbox">
      <span className="free">Free during launch</span>
      {active ? (
        <>
          <h3>You&apos;re favored</h3>
          <p>
            You are pinned to the top of {country} feeds in your category, where
            more people will see you.
          </p>
          <div className="counter">{fmt(ends! - now)}</div>
        </>
      ) : (
        <>
          <h3>Boost your profile</h3>
          <p>
            Sit at the top of {country} feeds in your category for one hour. More
            people see you, more save you.
          </p>
          <button className="btn btn-boost" onClick={boost} disabled={pending}>
            <Zap /> {pending ? "Boosting…" : "Boost for 1 hour"}
          </button>
        </>
      )}
    </div>
  );
}
