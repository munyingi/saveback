import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Lock, ArrowRight } from "lucide-react";
import { getPublicProfile, getMyProfile } from "@/lib/profile";
import { getSessionState } from "@/lib/session";
import { PhoneShell } from "@/components/PhoneShell";
import { PublicSaveCta } from "@/components/PublicSaveCta";
import { avatarColor, flagOf } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const p = await getPublicProfile(handle);
  return {
    title: p ? `${p.name} · SaveBack` : "SaveBack",
    description: p
      ? `Save ${p.name.split(" ")[0]} on SaveBack. They save you back.`
      : undefined,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const state = await getSessionState();
  const me = state.user ? await getMyProfile() : null;
  const isSelf = me?.id === profile.id;
  const first = profile.name.split(" ")[0];

  const rep = profile.reputation;
  const repTag =
    rep.label === "New" || rep.rate == null ? (
      <span className="tag rep">New</span>
    ) : (
      <span className={"tag rep" + (rep.label === "Reliable" ? " reliable" : "")}>
        {rep.label === "Reliable"
          ? `Reliable · ${rep.rate}%`
          : `${rep.rate}% saved back`}
      </span>
    );

  return (
    <PhoneShell>
      <div className="auth">
        <div className="brand">
          <b>
            Save<span>Back</span>
          </b>
          <small>save for save</small>
        </div>

        <p className="tg" style={{ marginTop: 18, marginBottom: 14 }}>
          You&apos;ve been invited to save for save.
        </p>

        <div className="card" style={{ margin: 0 }}>
          <div className="crow">
            <div className="av" style={{ background: avatarColor(profile.name) }}>
              {profile.name[0]?.toUpperCase()}
            </div>
            <div className="who">
              <h4>{profile.name}</h4>
              <div className="tags">
                <span className="tag">
                  {flagOf(profile.country)} {profile.country}
                </span>
                <span className="tag">{profile.category}</span>
                <span className="tag verif">
                  <BadgeCheck /> verified
                </span>
                {repTag}
              </div>
            </div>
          </div>
          {profile.blurb && <p className="blurb">{profile.blurb}</p>}
          <div className="numrow">
            <div className="locked">
              <Lock /> <span className="dots">•••• ••• •••</span>
            </div>
          </div>
        </div>

        <div className="lockmsg" style={{ marginTop: 12 }}>
          <Lock /> {first}&apos;s number unlocks once you both save.
        </div>

        <div className="go">
          {isSelf ? (
            <Link href="/you" className="btn btn-save">
              <ArrowRight /> This is your profile. Manage your invite
            </Link>
          ) : me ? (
            <PublicSaveCta targetId={profile.id} name={profile.name} />
          ) : state.user ? (
            <Link href="/onboarding" className="btn btn-save">
              Finish your profile to save {first} <ArrowRight />
            </Link>
          ) : (
            <Link href="/signin" className="btn btn-save">
              Join SaveBack to save {first} <ArrowRight />
            </Link>
          )}
          <p className="note">
            Real accounts only. Your number stays hidden until you both save,
            and your email is never shown.
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}
