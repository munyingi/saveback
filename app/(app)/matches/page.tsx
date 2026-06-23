import { getMatches } from "@/lib/matches";
import { getMyProfile } from "@/lib/profile";
import { MatchesList } from "@/components/app/MatchesList";

export const metadata = { title: "Matches" };

export default async function MatchesPage() {
  const [matches, profile] = await Promise.all([getMatches(), getMyProfile()]);

  return (
    <div className="body">
      <div className="lead">
        Matches <span className="sub">· numbers unlocked</span>
      </div>
      <MatchesList matches={matches} myName={profile?.name ?? "me"} />
    </div>
  );
}
