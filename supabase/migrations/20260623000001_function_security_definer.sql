-- Fix: is_banned() and reputation() must be SECURITY DEFINER, otherwise RLS
-- hides the tables they read from a normal caller (bans has no select policy;
-- saves is restricted to the caller's own rows). Both return only booleans /
-- aggregates about the requested user, so they leak no sensitive data.

create or replace function public.is_banned()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.bans where user_id = auth.uid());
$$;

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
