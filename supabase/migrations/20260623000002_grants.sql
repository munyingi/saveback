-- Table/function access grants for the app roles.
--
-- The schema relies on RLS for row-level security, but a role still needs the
-- table-level GRANT to attempt an operation at all. Supabase hosted provides
-- these via default privileges; a local CLI migration does not, so authenticated
-- writes fail with "permission denied for table". These grants are safe: every
-- table has RLS enabled, so rows are still filtered by policy (a table with no
-- policy, like bans, stays fully locked to normal users regardless of grant).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Apply the same to future objects created in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
