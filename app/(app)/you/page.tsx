import Link from "next/link";
import { BadgeCheck, Lock, Globe, Zap, Shield } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getMyReputation } from "@/lib/reputation";
import { getSessionState } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";
import { BoostBox } from "@/components/app/BoostBox";
import { InviteButton } from "@/components/app/InviteButton";
import { DeleteAccount } from "@/components/app/DeleteAccount";
import { avatarColor } from "@/lib/constants";
import { prettyPhone } from "@/lib/whatsapp";

export const metadata = { title: "You" };

export default async function YouPage() {
  const [profile, rep, state] = await Promise.all([
    getMyProfile(),
    getMyReputation(),
    getSessionState(),
  ]);
  if (!profile) return null;

  const phone = state.user?.phone ? prettyPhone(state.user.phone) : "—";
  const email = state.user?.email ?? "—";
  const boosted =
    profile.boosted &&
    !!profile.boost_ends_at &&
    new Date(profile.boost_ends_at) > new Date();

  const repTag =
    !rep || rep.label === "New" || rep.rate == null ? (
      <span className="tag rep">New</span>
    ) : (
      <span className={"tag rep" + (rep.label === "Reliable" ? " reliable" : "")}>
        {rep.label === "Reliable"
          ? `Reliable · ${rep.rate}%`
          : `${rep.rate}% saved back`}
      </span>
    );

  return (
    <div className="body">
      <div className="lead">You</div>

      <div className="mecard">
        <div className="av" style={{ background: avatarColor(profile.name) }}>
          {profile.name[0]?.toUpperCase()}
        </div>
        <h2>{profile.name}</h2>
        <div className="tags mtags">
          <span className="tag">
            <Globe /> {profile.country}
          </span>
          <span className="tag">{profile.category}</span>
          {repTag}
          {boosted && (
            <span className="tag boost">
              <Zap /> Favored
            </span>
          )}
        </div>
        <div className="idrow">
          <BadgeCheck /> {phone} · phone verified
        </div>
        <div className="idrow">
          <BadgeCheck /> {email} · email verified (private)
        </div>
        <div
          className="lockmsg"
          style={{ justifyContent: "center", marginTop: 8 }}
        >
          <Lock /> your number only appears on a mutual save
        </div>
      </div>

      {/* On desktop these live in the right-hand Grow panel instead. */}
      <div className="only-mobile">
        <BoostBox
          boostEndsAt={profile.boost_ends_at}
          country={profile.country}
        />
        <InviteButton handle={profile.handle} />
      </div>

      {profile.is_admin && (
        <Link
          href="/admin"
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: 14 }}
        >
          <Shield /> Admin dashboard
        </Link>
      )}

      <SignOutButton />

      <p className="note" style={{ marginTop: 14 }}>
        Everything is free for now. Paid boosts for wider reach are coming
        later.
      </p>

      <DeleteAccount />
    </div>
  );
}
