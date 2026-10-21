-- Provider view: run after schema.sql.
-- Pros can see open jobs in their trade and areas (without the customer's name or phone),
-- say they're interested, and keep their own availability, areas and prices up to date.

alter table public.pros add column if not exists available boolean not null default true;

-- a pro can always read their own listing, even if an admin has hidden it
create policy "pro reads own listing" on public.pros for select using (user_id = auth.uid());

-- ---------- interest in open jobs
create table public.job_interest (
  request_id uuid not null references public.requests on delete cascade,
  pro_id uuid not null references public.pros on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (request_id, pro_id)
);
alter table public.job_interest enable row level security;

create policy "pro registers interest for own listing" on public.job_interest for insert
  with check (pro_id in (select id from public.pros where user_id = auth.uid() and active));
create policy "pro sees own interest, admin sees all" on public.job_interest for select
  using (public.is_admin() or pro_id in (select id from public.pros where user_id = auth.uid()));

-- ---------- open jobs that fit this pro, with no customer contact details
create or replace function public.open_jobs_for_me()
returns table (id uuid, job_name text, category text, area text, urgency text, description text,
               own_materials boolean, budget numeric, created_at timestamptz, interested boolean)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.id, array(select lower(t) from unnest(p.trade || p.trades) t) as trades, p.areas
    from public.pros p where p.user_id = auth.uid() and p.active and p.kind <> 'supplier'
  )
  select r.id, r.job_name, r.category, r.area, r.urgency, r.description, r.own_materials, r.budget, r.created_at,
         exists (select 1 from public.job_interest i where i.request_id = r.id and i.pro_id = me.id)
  from public.requests r join me on true
  where r.status = 'new' and r.pro_id is null
    and r.area = any (me.areas)
    and (lower(r.category) = any (me.trades) or (lower(r.category) = 'other' and 'handyman' = any (me.trades)))
  order by (r.urgency like 'Emergency%') desc, r.created_at;
$$;
revoke all on function public.open_jobs_for_me() from public, anon;
grant execute on function public.open_jobs_for_me() to authenticated;

-- ---------- a pro edits their own listing (only these fields)
create or replace function public.update_my_pro(p_available boolean, p_areas text[], p_materials_policy text, p_price_ranges jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce(array_length(p_areas, 1), 0) = 0 then raise exception 'Choose at least one area'; end if;
  if jsonb_typeof(coalesce(p_price_ranges, '[]'::jsonb)) <> 'array' then raise exception 'Prices must be a list'; end if;
  update public.pros set available = p_available, areas = p_areas,
    materials_policy = nullif(trim(p_materials_policy), ''), price_ranges = coalesce(p_price_ranges, '[]'::jsonb)
  where user_id = auth.uid();
  if not found then raise exception 'No pro listing for this account'; end if;
end $$;
revoke all on function public.update_my_pro(boolean, text[], text, jsonb) from public, anon;
grant execute on function public.update_my_pro(boolean, text[], text, jsonb) to authenticated;
