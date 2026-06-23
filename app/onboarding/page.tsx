import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/session";
import { getMyProfile } from "@/lib/profile";
import { PhoneShell } from "@/components/PhoneShell";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { DEFAULT_COUNTRY } from "@/lib/constants";

export const metadata = { title: "Set up your profile" };

// Gate: signed in + phone verified + email verified + not banned. Then, if a
// profile already exists, skip straight into the app.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const [{ country }, state] = await Promise.all([
    searchParams,
    getSessionState(),
  ]);
  if (!state.user) redirect("/signin");
  if (state.banned) redirect("/signin?error=banned");
  if (!state.fullyVerified) redirect("/signin");

  const profile = await getMyProfile();
  if (profile) redirect("/discover");

  return (
    <PhoneShell>
      <OnboardingForm defaultCountry={country || DEFAULT_COUNTRY} />
    </PhoneShell>
  );
}
