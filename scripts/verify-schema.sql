-- SaveBack — schema verification.
-- Run this AFTER applying sample/schema.sql, in the Supabase SQL editor
-- (or: psql "$SUPABASE_DB_URL" -f scripts/verify-schema.sql).
-- Every check should pass before Step 2 is considered done.

-- 1) RLS must be ENABLED on every public table.
--    Expect 10 rows, all rls_enabled = true:
--    profiles, contacts, saves, matches, blocks,
--    reports, bans, banned_identifiers, boosts, payments
select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) Policy count per table. Note: `bans` and `banned_identifiers` intentionally
--    have RLS ON with ZERO policies (service-role only). Everything else > 0.
select
  tablename,
  count(*) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 3) Required functions must all be present (expect 6 rows).
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'handle_new_save', 'is_matched', 'feed',
    'is_banned', 'reputation', 'activate_boost'
  )
order by proname;

-- 4) The match-creation trigger must exist (expect 1 row: on_save_created).
select tgname, tgrelid::regclass as on_table
from pg_trigger
where tgname = 'on_save_created';

-- 5) The consent gate: confirm the contacts SELECT policy is owner-or-matched.
--    The qual should reference auth.uid() and is_matched(...).
select polname, pg_get_expr(polqual, polrelid) as using_expression
from pg_policy
where polrelid = 'public.contacts'::regclass
  and polcmd = 'r';
