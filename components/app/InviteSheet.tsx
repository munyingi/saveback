"use client";

import { useEffect, useState } from "react";
import { X, Copy, Send } from "lucide-react";
import QRCode from "qrcode";
import { inviteLink, inviteCaption } from "@/lib/whatsapp";

// Intro pack: free, capped queue of one-tap wa.me invites (§7). The send opens
// the user's OWN WhatsApp (they pick the recipient) — nothing is auto-sent, so
// the daily cap is client-side pacing. The paid seam swaps this for a tier.
const INVITE_CAP = 15;
const todayKey = () =>
  `saveback_invites_${new Date().toISOString().slice(0, 10)}`;

export function InviteSheet({
  handle,
  onClose,
}: {
  handle: string;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    const o = window.location.origin;
    setOrigin(o);
    QRCode.toDataURL(inviteLink(o, handle), {
      margin: 1,
      width: 320,
      color: { dark: "#10241B", light: "#FFFFFF" },
    })
      .then(setQr)
      .catch(() => {});
    try {
      setSent(Number(localStorage.getItem(todayKey()) ?? 0));
    } catch {
      /* ignore */
    }
  }, [handle]);

  const link = origin ? inviteLink(origin, handle) : "";
  const left = Math.max(0, INVITE_CAP - sent);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function sendOne() {
    if (left <= 0) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteCaption(origin, handle))}`,
      "_blank",
    );
    const n = sent + 1;
    setSent(n);
    try {
      localStorage.setItem(todayKey(), String(n));
    } catch {
      /* ignore */
    }
  }

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
        <h3 className="sheet-h">Your invite</h3>
        <p className="sheet-sub">
          Share this QR or link in your WhatsApp status and groups. Every scan
          is a real person who can save you back.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="Invite QR code" className="qr" />}
        <div className="linkbox">{link.replace(/^https?:\/\//, "")}</div>
        <button
          className="btn btn-copy"
          style={{ width: "100%" }}
          onClick={copy}
        >
          <Copy /> {copied ? "Copied" : "Copy link"}
        </button>

        <div className="intropack">
          <div className="ip-hd">
            <b>Invite pack</b>
            <span className="ip-left">
              {left} of {INVITE_CAP} left today
            </span>
          </div>
          <p className="ip-sub">
            One-tap invites sent from your own WhatsApp. You choose the
            recipient and we fill in the message. Free, capped, never automatic.
          </p>
          <button
            className="btn btn-wa"
            style={{ width: "100%" }}
            onClick={sendOne}
            disabled={left <= 0}
          >
            <Send /> {left > 0 ? "Send a one-tap invite" : "Come back tomorrow"}
          </button>
        </div>
      </div>
    </div>
  );
}
