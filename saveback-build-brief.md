# SaveBack — Build Brief for Claude Code

Hand this whole file to Claude Code, along with the `sample/` folder. The sample shows the intended architecture and, more importantly, the security model. Build the full app following this brief, using the sample as the reference for the parts it covers.

> **Suggested first prompt to Claude Code:**
> "Read `saveback-build-brief.md` and the `sample/` folder. Scaffold the app on Next.js (App Router, TypeScript) + Supabase + Cloudflare as an installable PWA. Start with phone-OTP auth, then apply the database schema and RLS from `sample/schema.sql`, then build the discover feed, the save-and-match flow, and the match reveal. Do not add anything outside this brief without asking me first."

---

## 1. What we're building

SaveBack is a save-for-save network for Kenya (expanding later). People exchange WhatsApp numbers to grow their status views and reach. A user creates a profile (name, country, category, short blurb), browses a feed of other real users, and taps "Save for save." A phone number stays hidden until both people have saved each other. On a mutual save, the number unlocks with a copy button and a one-tap WhatsApp "save me back" link that opens from the user's own phone.

## 2. Locked decisions (do not change these)

- **Deep-link sending only.** Every save-for-save and "save me back" action is a `wa.me` link opened from the user's own WhatsApp. There is no central system that sends WhatsApp messages on anyone's behalf. This keeps us off WhatsApp's ban list and inside consent.
- **Numbers are consent-gated in the database.** A user's phone is never visible in the feed or any API to anyone until a mutual match exists. This is enforced with row-level security, not just the UI. See `sample/schema.sql`.
- **No fake or seed users.** Do not generate placeholder or bot profiles. The feed shows real accounts only. Empty states and the invite flow handle cold start instead.
- **Free at launch.** Build boost and intro-pack features, but leave them free and ungated. Payments come later.
- **One codebase, one account.** The website and the mobile app are the same Next.js PWA on one Supabase backend. Register once, use either surface.
- **Kenya first, multi-country ready.** Country is a first-class field so expansion needs no rework.

## 3. Stack

- Next.js (App Router, TypeScript). Installable PWA: web manifest, service worker, offline shell. Optional later: Capacitor wrapper for App Store and Play.
- Supabase: Postgres, Auth (phone OTP), RLS, Storage (optional avatars).
- Cloudflare for hosting, CDN, and domain.
- Phone auth via Supabase OTP so every number is verified by construction. The verified auth phone is the contact number.
- Email is also verified at signup (Supabase email confirmation). Both a verified phone and a verified email are required to have a usable account. This is what makes bans stick. Email is private: it is never shown to other users and never shared on a match.

## 4. Core flows

1. **Onboarding.** Phone OTP sign-in plus email verification (both required). Then set name, country, category, blurb. Store the phone in `contacts` (verified); store public fields in `profiles`. Keep email in Supabase Auth only, never in `profiles`.
2. **Discover.** Ranked feed (see section 6). Cards show name, country, category, blurb, and a locked number. Action: "Save for save."
3. **Save.** Insert a `saves` row (from me to them). If they had already saved me, a match is created by a database trigger.
4. **Requests.** People who saved me first. Action: "Save back" to match, or "Skip."
5. **Matches.** Mutual saves. The number is revealed with copy and a WhatsApp deep link.
6. **Boost.** Pin my profile to the top of feeds in my country and category for a set time. Free for now. Design the timer and ranking so paid tiers switch on later.
7. **Invite.** Every user gets a public profile link (`/u/[handle]`) and a QR they can post to their own WhatsApp status or groups to collect saves. This is the main growth loop, so make it prominent.
8. **Safety.** Report and block on every profile. Blocked users never appear in each other's feed.

## 5. Data model

Full schema and policies are in `sample/schema.sql`. Tables: `profiles` (public fields, no phone, no email), `contacts` (phone, match-gated), `saves` (directional intent), `matches` (created by trigger when both directions exist), `blocks`, plus moderation: `reports`, `bans`, and `banned_identifiers` (salted hashes for ban-evasion prevention). The security guarantee lives in the `contacts` select policy: a phone row is readable only by its owner or by a matched user. Build every feature against this. Do not weaken it.

## 6. Feed ranking

Use the `feed()` RPC in the schema. Order: boosted-and-not-expired first, then country-and-category match, then country, then category, then everyone else, random within each tier. Exclude self, blocked users (either direction), and already-matched users.

## 7. Monetization (build now, charge later)

- **Boost:** longer and wider reach for a fee. For v1, free, fixed one hour, pinned in own country and category.
- **Intro packs:** a queue of one-tap `wa.me` invites the buyer sends from their own phone, never auto-sent. For v1, free and capped.
- When payments land: M-Pesa STK push via Safaricom Daraja as primary, plus card and PayPal. Verify the current Daraja API details at that point.

## 8. Cold start (without fakes)

- Ship a strong empty state that invites action, for example "Be the first in your area. Share your link."
- Build the invite link and QR early. They turn each signup into a recruiter.
- Add a `founding_member` flag on profiles for early adopters, with a perk such as free boost. Seeding is done by recruiting real people, never by generating profiles.

## 9. Safety, trust, and moderation

Three distinct layers, do not conflate them:

- **Block** (user to user): hides two users from each other's feed. Self-serve, no review.
- **Report** (user to platform): files a `reports` row for the moderation queue. Does not hide anyone by itself.
- **Ban** (platform to user): admin action that cuts the account off entirely. A banned user is excluded from the feed and rejected on every authenticated request (`is_banned()` gate). Banning also writes a salted hash of the person's verified phone and email to `banned_identifiers`, and signup checks new verified phone and email against that denylist so the same person cannot quietly re-register.

Other requirements:

- Verified phone and email on every account (section 3). Bans are only as strong as identity verification.
- Plain privacy copy on profile and onboarding: real people, consent only, number hidden until you both save, email never shown.
- Rate-limit saves to deter spammy mass-saving.

Three honest caveats to design around:

- Verification raises the cost of coming back, it does not make it impossible. A determined abuser can get a new SIM and a new email. The denylist deters casual ban evasion; pair it with rate limits and report review for the rest.
- Storing verified phone and email means you are now handling more personal data under Kenya's Data Protection Act 2019. You need a privacy policy, a lawful basis, minimal retention, and proper security. Store only hashes in `banned_identifiers`, never raw phone or email.
- Requiring email plus phone adds signup friction, which trades against growth. If conversion suffers, consider making email verification a soft requirement that is enforced before a user can be matched, rather than blocking the very first screen. Your call; the schema supports either.

Moderation writes (`bans`, `banned_identifiers`) and the signup denylist check run only on a backend with the Supabase service role, never from client code.

## 10. Out of scope for v1

Payments and paywalls, in-app chat, the native store wrapper, multi-language. Leave clean seams for each.

## 11. Acceptance criteria (testable)

- A phone in `contacts` is not returned by any query to a non-matched user. Verify by trying to read another user's contact before and after a mutual save.
- Saving someone who already saved you creates a match and reveals both numbers.
- The feed never shows your own profile, blocked users, or existing matches, and it ranks per section 6.
- "Save me back on WhatsApp" opens `wa.me` with the number and a prefilled message, from the user's own WhatsApp.
- No profile exists that was not created by a real signed-in user.
- An account requires both a verified phone and a verified email.
- A banned user is excluded from the feed and rejected on authenticated requests.
- A banned person's phone or email hash blocks re-registration with the same identifiers.
- Reporting a user creates a moderation record without exposing reports to other users.
- A profile's reputation is computed from objective in-app reciprocity (the `reputation()` function), not from self-reports alone.
- Free, admin, and paid boosts all activate through `activate_boost()`, so a confirmed payment can turn on a boost with no manual step.
- The app installs to a phone home screen and runs full-screen.

## 12. Suggested structure

```
app/            onboarding, discover, requests, matches, me, u/[handle]
app/actions.ts  server actions
lib/supabase/   server + browser clients
lib/whatsapp.ts deep-link + invite helpers
components/      cards, feed, reveal
supabase/        schema.sql
public/          manifest.json, icons, service worker
```

## 13. The sample

- `sample/schema.sql` — full Postgres schema, RLS, match trigger, and feed RPC. Run this first.
- `sample/lib/whatsapp.ts` — deep-link and invite-link helpers.
- `sample/app/actions.ts` — server actions for save, feed, matches, block.
- `sample/components/MatchCard.tsx` — the match reveal (copy + WhatsApp), number shown only when unlocked.

Design: match the prototype already built (locked-number-to-unlock reveal, country and category chips, bottom-tab mobile shell). Keep the consent-gating visible in the copy.

## 14. Reputation (save-back score)

The differentiator against free WhatsApp groups. It is built on objective in-app reciprocity, not on anything self-reported or unverifiable.

- **Core signal:** of the people who saved a user first, what share did the user save back. Computed by the `reputation()` function in `sample/schema.sql`.
- **Fairness timing:** a received request only counts once the user had a fair chance to act, defined as either they logged in since it arrived (`last_active_at` past the request time) or 48 hours elapsed, whichever comes first. A fresh, unseen request never dings anyone. Update `last_active_at` on login or a lightweight heartbeat.
- **Recency:** only active accounts can show as "Reliable." Absent is not reliable.
- **Badge:** "Reliable" at 80%+ over at least 10 answered requests; "New" below the sample threshold and never penalised. Show the percentage and badge on every profile card.
- **Optional second signal (later, low weight):** after a match, on the requester's next session about a day later, ask once "Did they save you back on WhatsApp?" Store separately, blend in at low weight, require volume, and watch for revenge or collusion. It refines the score, it never decides a badge alone.
- **Reuse:** the same reciprocity data flags freeloaders and number-harvesters (collect saves, rarely reciprocate, or mass-match then go silent). Pair with daily save and match caps.

## 15. Admin dashboard and boost pipeline

A separate admin-only area, served server-side with the Supabase service role (which bypasses RLS for cross-user reads). Gate it on `profiles.is_admin`.

- **Overview:** signups, active users (daily and weekly), total saves and matches, reputation distribution, live boosts, open reports, bans, and growth over time.
- **Users:** search, open any profile, see their stats and reputation, ban or unban, and review their reports.
- **Promote a number:** one click to boost any profile you choose. Calls `activate_boost(user, minutes, 'admin', null, admin_id)`.
- **Leaderboards:** top savers and most reliable, by county and category.

Boost activation is one path, free now and paid later. Everything goes through `activate_boost(user, minutes, source)`:

- **Now:** called for free, or from the dashboard as an admin grant.
- **Later:** the M-Pesa STK or card webhook verifies the payment, sets `payments.status = 'paid'`, then calls `activate_boost(user, 60, 'payment', payment_id)`. The boost turns on automatically and the profile rises to the top of its country and category feed for the hour. No manual step. Make it idempotent on `payments.provider_ref`.

All boost, payment, ban, and admin writes run server-side with the service role, never from client code.
