import { Zap } from "lucide-react";
import { GlobeSwitcher } from "@/components/app/GlobeSwitcher";
import type { Profile } from "@/lib/profile";

export function AppHeader({ profile }: { profile: Profile }) {
  const boosted =
    profile.boosted &&
    !!profile.boost_ends_at &&
    new Date(profile.boost_ends_at) > new Date();

  return (
    <div className="hdr">
      <div className="brand">
        <b>
          Save<span>Back</span>
        </b>
        <small>save for save</small>
      </div>
      <div className="hdr-right">
        {boosted && (
          <div className="boostpill">
            <Zap /> Favored
          </div>
        )}
        <GlobeSwitcher />
      </div>
    </div>
  );
}
