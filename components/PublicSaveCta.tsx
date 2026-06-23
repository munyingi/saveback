"use client";

import { useState, useTransition } from "react";
import { Heart, Clock, Check } from "lucide-react";
import { saveForSave } from "@/app/actions";

export function PublicSaveCta({
  targetId,
  name,
}: {
  targetId: string;
  name: string;
}) {
  const first = name.split(" ")[0];
  const [saved, setSaved] = useState(false);
  const [matched, setMatched] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setError("");
    startTransition(async () => {
      try {
        const r = await saveForSave(targetId);
        setSaved(true);
        setMatched(r.matched);
        setMsg(
          r.matched
            ? `You matched with ${first}. Open Matches to see their number.`
            : `Saved ${first}. They will see your request and can save you back.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      }
    });
  }

  if (saved) {
    return (
      <>
        <button className="btn btn-wait">
          {matched ? <Check /> : <Clock />}{" "}
          {matched ? "Matched!" : "Saved, waiting for them…"}
        </button>
        {msg && <p className="note">{msg}</p>}
      </>
    );
  }

  return (
    <>
      <button className="btn btn-save" onClick={save} disabled={pending}>
        <Heart /> {pending ? "Saving…" : `Save ${first}`}
      </button>
      {error && <p className="errmsg">{error}</p>}
    </>
  );
}
