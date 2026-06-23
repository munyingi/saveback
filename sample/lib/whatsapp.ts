// lib/whatsapp.ts
// Every "send" in SaveBack is a wa.me link the user opens from their OWN WhatsApp.
// Nothing here messages anyone automatically. That is deliberate and load-bearing.

/** Strip a phone down to digits for wa.me (no +, no spaces). */
export function toDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/** Pretty E.164 for display, e.g. +254 712 345 678 (Kenya-aware, safe fallback). */
export function prettyPhone(phone: string): string {
  const d = toDigits(phone);
  if (d.startsWith("254") && d.length === 12) {
    return `+254 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  return `+${d}`;
}

/** One-tap "save me back" link. Opens the user's WhatsApp with the message prefilled. */
export function saveForSaveLink(phone: string, fromName: string, toName: string): string {
  const num = toDigits(phone);
  const msg = `Hey ${toName}, this is ${fromName}. Save for save 🙏`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

/** Public profile link a user drops in their own WhatsApp status / groups to collect saves. */
export function inviteLink(origin: string, handle: string): string {
  return `${origin}/u/${handle}`;
}

/** Prefilled status caption to share the invite link. */
export function inviteCaption(origin: string, handle: string): string {
  return `Save me on SaveBack, I save you back 🙌 ${inviteLink(origin, handle)}`;
}
