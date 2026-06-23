-- One-time reset to clear a partial/previous apply on a FRESH project.
-- WARNING: drops SaveBack's tables and data. Only run on a dev/empty project.
-- Safe to run from any partial state (every drop is IF EXISTS). Run this, then
-- run sample/schema.sql, then scripts/verify-schema.sql.

drop function if exists public.activate_boost(uuid, int, text, uuid, uuid) cascade;
drop function if exists public.reputation(uuid) cascade;
drop function if exists public.feed(int) cascade;
drop function if exists public.is_banned() cascade;
drop function if exists public.is_matched(uuid) cascade;
drop function if exists public.handle_new_save() cascade;

drop table if exists
  public.payments,
  public.boosts,
  public.banned_identifiers,
  public.bans,
  public.reports,
  public.blocks,
  public.matches,
  public.saves,
  public.contacts,
  public.profiles
cascade;
