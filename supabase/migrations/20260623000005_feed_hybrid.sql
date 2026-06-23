-- Feed per brief §6: own country prioritized, then global. Default (p_country
-- NULL): boosted → country+category → country → category → everyone, random
-- within each tier. The globe switcher passes a country to narrow the view.

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
