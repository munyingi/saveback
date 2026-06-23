-- Updated prototype: the feed is browsed one country at a time (default = your
-- own country; a globe switcher picks another). Replaces the cross-country
-- ranking with: scope to a country, then boosted, then your-category, then rest.

drop function if exists public.feed(int);

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
    and p.country = coalesce(p_country, me.country)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = p.id)
         or (b.blocker = p.id and b.blocked = auth.uid())
    )
    and not public.is_matched(p.id)
    and not exists (select 1 from public.bans bn where bn.user_id = p.id)
  order by
    (p.boosted and coalesce(p.boost_ends_at, now()) > now()) desc,
    case when p.category = me.category then 0 else 1 end,
    random()
  limit p_limit;
$$;

grant execute on function public.feed(int, text) to anon, authenticated, service_role;
