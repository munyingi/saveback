import { Search, Share2, BadgeCheck } from "lucide-react";
import { BoostBox } from "@/components/app/BoostBox";
import { InviteButton } from "@/components/app/InviteButton";
import type { Profile } from "@/lib/profile";

// Right-hand panel for the wide desktop layout (≥1024px). A persistent place to
// grow reach: boost, invite, and a few plain pointers. Hidden on phone/tablet,
// where boost and invite live on the You tab instead.
const TIPS = [
  {
    Icon: Search,
    text: "Save people in Discover. When they save you back, their number appears in Matches.",
  },
  {
    Icon: Share2,
    text: "Share your invite link in your WhatsApp status to reach more people.",
  },
  {
    Icon: BadgeCheck,
    text: "A clear photo and a short, specific note get saved back more often.",
  },
];

export function GrowPanel({ profile }: { profile: Profile }) {
  return (
    <aside className="deck-rail rail-right">
      <h3 className="rail-h">Grow your reach</h3>

      <BoostBox boostEndsAt={profile.boost_ends_at} country={profile.country} />
      <InviteButton handle={profile.handle} />

      <ul className="grow-tips">
        {TIPS.map(({ Icon, text }, i) => (
          <li key={i}>
            <Icon />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
