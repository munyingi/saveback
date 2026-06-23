import { getFeed } from "@/lib/feed";
import { getMyProfile } from "@/lib/profile";
import { DiscoverFeed } from "@/components/app/DiscoverFeed";
import { DEFAULT_COUNTRY } from "@/lib/constants";

export const metadata = { title: "Discover" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const [{ country }, profile] = await Promise.all([
    searchParams,
    getMyProfile(),
  ]);

  const myCountry = profile?.country ?? DEFAULT_COUNTRY;
  // No country param => cross-country feed (your area first, then global).
  const scopedCountry = country || null;
  const feed = await getFeed(scopedCountry ?? undefined);

  return (
    <DiscoverFeed
      key={scopedCountry ?? "everywhere"}
      items={feed}
      scopedCountry={scopedCountry}
      myCountry={myCountry}
      myCategory={profile?.category ?? "Business"}
    />
  );
}
