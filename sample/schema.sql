-- SaveBack schema for Supabase (Postgres)
-- Run this once in the Supabase SQL editor.
-- The security model: a phone number lives in `contacts` and is readable
-- ONLY by its owner or by a user who has a mutual match. That is what makes
-- "number unlocks when you both save" real and not just a UI trick.
--
-- NOTE: object order matters. `language sql` function bodies are validated at
-- creation time (check_function_bodies = on), so every table a function reads
-- must already exist. The moderation tables are therefore declared BEFORE the
-- feed() RPC, which filters out banned users.

-- =========================================================
-- TABLES
-- =========================================================

-- Public discovery fields. No phone here, ever.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text unique,                       -- for /u/[handle] invite links
  name            text not null,
  country         text not null default 'Kenya',
  category        text not null,
  blurb           text,
  boosted         boolean not null default false,
  boost_ends_at   timestamptz,
  founding_member boolean not null default false,
  is_admin        boolean not null default false,
  last_active_at  timestamptz,                       -- updated on login/heartbeat; used by reputation timing
  created_at      timestamptz not null default now()
);

-- The sensitive phone, gated by a match.
create table public.contacts (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  phone    text not null,                            -- E.164, verified via Supabase phone OTP
  verified boolean not null default false
);

-- Directional intent: from_user wants save-for-save with to_user.
create table public.saves (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

-- A match exists when both directions exist. Stored once, ordered.
create table public.matches (
  user_a     uuid not null references public.profiles(id) on delete cascade,
  user_b     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table public.blocks (
  blocker    uuid not null references public.profiles(id) on delete cascade,
  blocked    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

-- Moderation tables, declared up here so feed() can reference public.bans.

-- User reports (any user can file one; reading is admin-only via service role).
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter    uuid not null references public.profiles(id) on delete cascade,
  reported    uuid not null references public.profiles(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  status      text not null default 'open'   -- open | reviewed | actioned
);

-- Platform bans (admin only). A banned user is cut off from the app.
create table public.bans (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  reason     text,
  banned_at  timestamptz not null default now(),
  banned_by  uuid references public.profiles(id) on delete set null
);

-- Denylist of banned identifiers so a banned person cannot just re-register.
-- Store a SALTED HASH of the phone/email, never the raw value. Checked at signup
-- server-side (service role) against the new user's verified phone and email.
create table public.banned_identifiers (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('phone','email')),
  id_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (kind, id_hash)
);

create index on public.saves (to_user);
create index on public.profiles (country, category);

-- =========================================================
-- MATCH CREATION TRIGGER
-- =========================================================
-- When a save is inserted and the reciprocal save already exists, create a match.

create or replace function public.handle_new_save()
returns trigger language plpgsql security definer as $$
begin
  if exists (
    select 1 from public.saves s
    where s.from_user = new.to_user and s.to_user = new.from_user
  ) then
    insert into public.matches (user_a, user_b)
    values (least(new.from_user, new.to_user), greatest(new.from_user, new.to_user))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_save_created
  after insert on public.saves
  for each row execute function public.handle_new_save();

-- Helper: does the current user have a match with `target`?
create or replace function public.is_matched(target uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.matches m
    where m.user_a = least(auth.uid(), target)
      and m.user_b = greatest(auth.uid(), target)
  );
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.saves    enable row level security;
alter table public.matches  enable row level security;
alter table public.blocks   enable row level security;

-- profiles: any signed-in user can read profiles (for the feed); manage only your own.
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- contacts: the gate. Readable only by the owner OR a matched user.
create policy "read own or matched contact"
  on public.contacts for select to authenticated
  using (user_id = auth.uid() or public.is_matched(user_id));
create policy "insert own contact"
  on public.contacts for insert to authenticated with check (user_id = auth.uid());
create policy "update own contact"
  on public.contacts for update to authenticated using (user_id = auth.uid());

-- saves: create your own; read saves you are part of.
create policy "create own save"
  on public.saves for insert to authenticated with check (from_user = auth.uid());
create policy "read my saves"
  on public.saves for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- matches: read matches you are in.
create policy "read my matches"
  on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- blocks: manage your own.
create policy "manage own blocks"
  on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

-- =========================================================
-- MODERATION RLS + BAN GATE
-- =========================================================
-- Authenticity: require a VERIFIED phone AND a VERIFIED email at signup.
-- Supabase Auth holds both on auth.users (phone_confirmed_at, email_confirmed_at).
-- Email stays private: it is NOT in `profiles` and is never shown to other users
-- or shared on a match. Only the WhatsApp number is shared, and only on a match.

alter table public.reports             enable row level security;
alter table public.bans                enable row level security;
alter table public.banned_identifiers  enable row level security;

-- reports: a user can file a report as themselves. No client read/update/delete.
create policy "file own report"
  on public.reports for insert to authenticated with check (reporter = auth.uid());

-- bans + banned_identifiers: NO client policies at all. Only the service role
-- (your moderation backend) touches these, which bypasses RLS. Leaving them with
-- RLS enabled and zero policies means normal users can neither read nor write them.

-- Is the current user banned? Used by the app to gate access on each request.
-- security definer: `bans` has RLS enabled with NO policies, so a normal
-- (authenticated) caller can't read it. Without definer this would always
-- return false and the ban gate would fail open. Returns only a boolean about
-- the caller themselves, so it leaks nothing.
create or replace function public.is_banned()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.bans where user_id = auth.uid());
$$;

-- =========================================================
-- FEED RPC (ranked discovery)
-- =========================================================
-- Security definer so it can rank across all profiles, but it returns only
-- non-sensitive fields (never a phone) and hand-filters self/blocked/matched.

-- §6: own country prioritized, then global. Default (p_country NULL): boosted →
-- country+category → country → category → everyone, random within tier. The
-- globe switcher passes a country to narrow the view. Never returns a phone.
create or replace function public.feed(p_limit int default 30, p_country text default null)
returns table (
  id uuid, name text, country text, category text, blurb text,
  boosted boolean, saved_by_me boolean
) language sql stable security definer as $$
  with me as (select country, category from public.profiles where id = auth.uid())
  select
    p.id, p.name, p.country, p.category, p.blurb,
    (p.boosted and coalesce(p.boost_ends_at, now()) > now()) as boosted,
    exists (
      select 1 from public.saves s
      where s.from_user = auth.uid() and s.to_user = p.id
    ) as saved_by_me
  from public.profiles p, me
  where p.id <> auth.uid()
    and (p_country is null or p.country = p_country)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = p.id)
         or (b.blocker = p.id and b.blocked = auth.uid())
    )
    and not public.is_matched(p.id)
    and not exists (select 1 from public.bans bn where bn.user_id = p.id)
  order by
    (p.boosted and coalesce(p.boost_ends_at, now()) > now()) desc,
    case
      when p_country is not null then
        case when p.category = me.category then 0 else 1 end
      else
        case
          when p.country = me.country and p.category = me.category then 0
          when p.country = me.country then 1
          when p.category = me.category then 2
          else 3
        end
    end,
    random()
  limit p_limit;
$$;

-- =========================================================
-- REPUTATION (objective, from in-app reciprocity)
-- =========================================================
-- The score does NOT trust self-reports and needs no "did they save you?" popup.
-- It measures: of the people who saved YOU first, how many did you save back,
-- counting a request only once you had a fair chance to act on it:
--   either you logged in since it arrived (last_active_at > request time)
--   or 48h have passed (whichever comes first).

-- security definer: must read ALL of target's received/sent saves to compute
-- the rate. Under the caller's RLS, `saves` is restricted to rows the caller is
-- in, which would make the score wrong. Returns only aggregate, non-PII numbers.
create or replace function public.reputation(target uuid)
returns table (saves_back_rate numeric, sample int, label text)
language sql stable security definer as $$
  with answerable as (
    select
      exists (
        select 1 from public.saves r
        where r.from_user = target and r.to_user = s.from_user
      ) as saved_back
    from public.saves s
    join public.profiles p on p.id = target
    where s.to_user = target
      and (
        (p.last_active_at is not null and p.last_active_at > s.created_at)
        or now() - s.created_at > interval '48 hours'
        -- already saved back counts even if recent:
        or exists (select 1 from public.saves r
                   where r.from_user = target and r.to_user = s.from_user)
      )
  )
  select
    case when count(*) = 0 then null
         else round(100.0 * count(*) filter (where saved_back) / count(*), 0) end as saves_back_rate,
    count(*)::int as sample,
    case
      when count(*) < 10 then 'New'
      when 100.0 * count(*) filter (where saved_back) / count(*) >= 80 then 'Reliable'
      when 100.0 * count(*) filter (where saved_back) / count(*) >= 50 then 'OK'
      else 'Low'
    end as label
  from answerable;
$$;
-- Note: optional self-report ("did they save you back on WhatsApp?") can be stored
-- in a separate table later and blended in at LOW weight. Keep it secondary; it is
-- gameable. The objective rate above stays the spine of the score.

-- =========================================================
-- BOOSTS + PAYMENTS (one activation path: free now, paid later)
-- =========================================================

create table public.boosts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source      text not null check (source in ('free','admin','payment','referral')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_by  uuid references public.profiles(id) on delete set null,   -- admin who granted, if any
  payment_id  uuid,                                  -- linked payment, if paid
  created_at  timestamptz not null default now()
);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null,                        -- mpesa | card | paypal
  provider_ref text unique,                          -- STK ref / charge id (idempotency)
  amount       numeric,
  currency     text not null default 'KES',
  product      text not null,                        -- e.g. boost_1h
  status       text not null default 'pending',      -- pending | paid | failed
  created_at   timestamptz not null default now()
);

alter table public.boosts   enable row level security;
alter table public.payments enable row level security;
-- A user may read their own boost/payment history; all writes are service-role only.
create policy "read own boosts"   on public.boosts   for select to authenticated using (user_id = auth.uid());
create policy "read own payments" on public.payments for select to authenticated using (user_id = auth.uid());

-- The single activation path. Called free/admin today, by the payment webhook later.
create or replace function public.activate_boost(
  p_user uuid, p_minutes int, p_source text,
  p_payment uuid default null, p_admin uuid default null
) returns void language plpgsql security definer as $$
declare e timestamptz := now() + make_interval(mins => p_minutes);
begin
  insert into public.boosts (user_id, source, ends_at, created_by, payment_id)
  values (p_user, p_source, e, p_admin, p_payment);
  -- refresh the cached fields the feed reads (extend if a boost is already live)
  update public.profiles
     set boosted = true,
         boost_ends_at = greatest(coalesce(boost_ends_at, now()), e)
   where id = p_user;
end;
$$;
-- WIRING: M-Pesa STK / card webhook -> verify payment -> set payments.status='paid'
-- -> call activate_boost(user, 60, 'payment', payment_id). No manual step.
-- Admin "promote this number" -> activate_boost(user, 60, 'admin', null, admin_id).
-- Both run server-side with the service role.

-- =========================================================
-- PUBLIC INVITE PROFILE
-- =========================================================
-- /u/[handle] must be readable by not-yet-signed-up visitors. profiles RLS is
-- authenticated-only, so expose a single profile by handle here. Public fields
-- only (never the phone); banned users are hidden.

create or replace function public.public_profile(p_handle text)
returns table (
  id uuid, name text, country text, category text, blurb text, boosted boolean
) language sql stable security definer as $$
  select
    p.id, p.name, p.country, p.category, p.blurb,
    (p.boosted and coalesce(p.boost_ends_at, now()) > now())
  from public.profiles p
  where p.handle = p_handle
    and not exists (select 1 from public.bans bn where bn.user_id = p.id)
  limit 1;
$$;

-- =========================================================
-- GRANTS (access layer; RLS still enforces row-level security)
-- =========================================================
-- A role needs a table-level GRANT to attempt an operation at all; RLS then
-- filters the rows. Supabase hosted supplies these via default privileges, but
-- a plain `psql`/CLI apply does not — without them, authenticated writes fail
-- with "permission denied for table". Safe because every table has RLS enabled
-- (a policy-less table like `bans` stays fully locked to normal users).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
