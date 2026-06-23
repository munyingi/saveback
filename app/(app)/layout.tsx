import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/session";
import { getMyProfile } from "@/lib/profile";
import { getRequestsCount } from "@/lib/requests";
import { touchLastActive } from "@/app/actions";
import { AppHeader } from "@/components/app/AppHeader";
import { BottomNav } from "@/components/app/BottomNav";
import { DesktopRail } from "@/components/app/DesktopRail";
import { GrowPanel } from "@/components/app/GrowPanel";

// The gated app shell: header + bottom tabs. Blocks anyone who isn't signed in,
// fully verified, not banned, and onboarded.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getSessionState();
  if (!state.user) redirect("/signin");
  if (state.banned) redirect("/signin?error=banned");
  if (!state.fullyVerified) redirect("/signin");

  const profile = await getMyProfile();
  if (!profile) redirect("/onboarding");

  // Heartbeat for reputation()'s fairness timing.
  await touchLastActive();

  const requestsCount = await getRequestsCount();

  return (
    <div className="sb-root">
      <div className="deck">
        <DesktopRail
          requestsCount={requestsCount}
          isAdmin={!!profile.is_admin}
          name={profile.name}
          country={profile.country}
        />
        <div className="phone">
          <AppHeader profile={profile} />
          {children}
          <BottomNav requestsCount={requestsCount} />
        </div>
        <GrowPanel profile={profile} />
      </div>
    </div>
  );
}
