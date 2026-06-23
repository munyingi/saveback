import Link from "next/link";
import {
  BadgeCheck,
  Lock,
  EyeOff,
  Heart,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// Server Component: we can safely read whether env is configured (boolean only,
// never the key itself).
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

const TRUST = [
  {
    icon: BadgeCheck,
    title: "Real accounts only",
    body: "Every profile is a real person with a verified phone and email. No fake accounts.",
  },
  {
    icon: Lock,
    title: "Private until it's mutual",
    body: "Your number only appears once you both save. This is enforced in the database, not just hidden on screen.",
  },
  {
    icon: EyeOff,
    title: "Your email stays private",
    body: "It is used only for your account and security. It is never shown to anyone and never shared on a match.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-6 pb-10 pt-16">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-save text-white shadow-[0_8px_24px_-12px_rgba(12,168,108,.7)]">
          <Heart className="h-6 w-6" fill="currentColor" />
        </span>
        <div className="leading-none">
          <p className="font-display text-2xl font-extrabold tracking-tight">
            Save<span className="text-save">Back</span>
          </p>
          <p className="mt-1 text-xs text-muted">save for save</p>
        </div>
      </div>

      {/* Hero */}
      <div className="mt-12">
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">
          Grow your reach.
          <br />
          <span className="text-save">Save for save.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          Exchange WhatsApp numbers with real people to grow your status views
          and reach. Save someone, and when they save you back, their number
          appears.
        </p>
      </div>

      {/* Trust points */}
      <ul className="mt-9 space-y-3">
        {TRUST.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5"
          >
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-save-soft text-save">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold">{title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto pt-10">
        <Link
          href="/signin"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-save px-4 py-3.5 font-body text-[15px] font-bold text-white transition active:scale-[.98]"
        >
          Get started <ArrowRight className="h-[18px] w-[18px]" />
        </Link>

        {/* Dev-only nudge: shown until Supabase env is wired. */}
        {!supabaseConfigured && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-boost/40 bg-boost-soft px-3 py-1.5 text-[#9a5e0e]">
              <AlertCircle className="h-3.5 w-3.5" /> Add Supabase keys to
              .env.local
            </span>
          </div>
        )}

        <p className="mt-5 text-center text-[12px] leading-relaxed text-muted">
          Free to join. Verified accounts only. Your number stays private.
        </p>
      </div>
    </main>
  );
}
