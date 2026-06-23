import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

// Served by the service worker when a navigation fails while offline.
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-phone flex-col items-center justify-center px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-muted">
        <WifiOff className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        SaveBack needs a connection to load new people and matches. Reconnect and
        try again.
      </p>
    </main>
  );
}
