"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { InviteSheet } from "@/components/app/InviteSheet";

export function InviteButton({ handle }: { handle: string | null }) {
  const [open, setOpen] = useState(false);
  if (!handle) return null;

  return (
    <>
      <button
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: 14 }}
        onClick={() => setOpen(true)}
      >
        <Share2 /> Share my invite
      </button>
      {open && <InviteSheet handle={handle} onClose={() => setOpen(false)} />}
    </>
  );
}
