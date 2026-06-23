-- Public invite page (/u/[handle]) must be readable by NOT-yet-signed-up
-- visitors. profiles RLS is authenticated-only, so expose a single profile by
-- handle through a security-definer function. Returns public fields only —
-- never the phone — and hides banned users.

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

grant execute on function public.public_profile(text) to anon, authenticated, service_role;
