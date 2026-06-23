-- Self-serve account deletion (§ user data control).
--
-- Deleting a person removes their auth.users row; that cascades to profiles and
-- then to every table keyed on profiles(id) ON DELETE CASCADE (contacts, saves,
-- matches, blocks, reports, bans, boosts, payments). The two columns below point
-- the OTHER way — they record which admin issued a ban or granted a boost — and
-- default to NO ACTION, which would block deleting an admin who had taken those
-- actions. Switch them to ON DELETE SET NULL so the audit row survives with a
-- null actor instead of pinning the account in place.
--
-- The signup denylist (banned_identifiers) is intentionally NOT touched here: a
-- voluntary deletion is not a ban, so the person is free to register again.

alter table public.bans
  drop constraint if exists bans_banned_by_fkey,
  add  constraint bans_banned_by_fkey
       foreign key (banned_by) references public.profiles(id) on delete set null;

alter table public.boosts
  drop constraint if exists boosts_created_by_fkey,
  add  constraint boosts_created_by_fkey
       foreign key (created_by) references public.profiles(id) on delete set null;
