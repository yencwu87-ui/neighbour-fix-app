-- Neighbour Fix database schema for Supabase (Postgres).
-- Run this once in the Supabase SQL editor of a new project, then run seed.sql.
-- Every table has row-level security on: customers see only their own jobs,
-- pros see only jobs assigned to them, and only an admin can list pros,
-- approve applications or change prices and fees.

create extension if not exists pgcrypto;

-- ---------- people
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'customer' check (role in ('customer','pro','admin')),
  name text,
  phone text,
  created_at timestamptz not null default now()
);

-- every new sign-up gets a customer profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- listed pros and suppliers
create table public.pros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  name text not null,
  kind text not null default 'repair' check (kind in ('repair','design','supplier')),
  trade text not null,
  trades text[] not null default '{}',
  areas text[] not null default '{}',
  licence_type text,
  licence_checked date,
  materials_policy text,
  price_ranges jsonb not null default '[]',
  note text,
  origin text,
  delivers boolean,
  active boolean not null default true,
  example boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- applications to join (private to the applicant and admins)
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  trade text not null,
  areas text[] not null default '{}',
  phone text not null,
  licence_type text,
  licence_no text,
  years int,
  reviews text,
  prices_text text,
  agreed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------- customer jobs
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  phone text,
  area text not null,
  category text not null,
  job_id text,
  job_name text,
  urgency text not null default 'This week',
  description text not null,
  budget numeric,
  own_materials boolean not null default false,
  scope jsonb,
  estimate jsonb,
  status text not null default 'new' check (status in ('new','matched','quoted','done','cancelled')),
  pro_id uuid references public.pros on delete set null,
  quote jsonb,
  rating int check (rating between 1 and 5),
  review text,
  example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- prices and fees
create table public.rates (
  job_id text primary key,
  low numeric not null,
  high numeric not null,
  example boolean not null default true
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  commission_pct numeric not null default 12,
  customer_fee numeric,
  customer_fee_label text default 'Booking and job guarantee',
  customer_fee_on boolean not null default false,
  emergency_fee numeric,
  plan_price numeric,
  plan_includes text[] not null default '{}',
  reno_fee text,
  example boolean not null default true
);

-- ---------- row-level security
alter table public.profiles enable row level security;
alter table public.pros enable row level security;
alter table public.applications enable row level security;
alter table public.requests enable row level security;
alter table public.rates enable row level security;
alter table public.settings enable row level security;

create policy "own profile or admin reads" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile edits, no role change" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "admin edits any profile" on public.profiles for update using (public.is_admin());

create policy "anyone reads active pros" on public.pros for select using (active or public.is_admin());
create policy "admin writes pros" on public.pros for all using (public.is_admin()) with check (public.is_admin());

create policy "apply for yourself" on public.applications for insert with check (user_id = auth.uid() and status = 'pending');
create policy "see own application or admin" on public.applications for select using (user_id = auth.uid() or public.is_admin());
create policy "admin reviews applications" on public.applications for update using (public.is_admin());

create policy "book for yourself" on public.requests for insert
  with check (customer_id = auth.uid() and status = 'new' and pro_id is null and quote is null and rating is null);
create policy "see own, assigned or all as admin" on public.requests for select using (
  customer_id = auth.uid() or public.is_admin()
  or pro_id in (select id from public.pros where user_id = auth.uid()));
create policy "customer, assigned pro or admin updates" on public.requests for update using (
  customer_id = auth.uid() or public.is_admin()
  or pro_id in (select id from public.pros where user_id = auth.uid()));

-- what each side may change on a job
create or replace function public.guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_pro boolean;
begin
  new.updated_at := now();
  if public.is_admin() then return new; end if;
  is_pro := old.pro_id in (select id from public.pros where user_id = auth.uid());
  if is_pro then
    -- the assigned pro may send the quote and mark the job done, nothing else
    if new.customer_id <> old.customer_id or new.pro_id is distinct from old.pro_id
       or new.rating is distinct from old.rating or new.review is distinct from old.review
       or new.description <> old.description or new.phone is distinct from old.phone then
      raise exception 'Pros can only update the quote and job status';
    end if;
    if new.status not in ('matched','quoted','done') then raise exception 'Status not allowed'; end if;
    return new;
  end if;
  -- the customer may rate a finished job, or cancel one that has no quote yet
  if new.status = 'cancelled' and old.status in ('new','matched') then
    if row(new.quote, new.pro_id, new.rating) is distinct from row(old.quote, old.pro_id, old.rating) then raise exception 'Only the status can change when cancelling'; end if;
    return new;
  end if;
  if old.status <> 'done' then raise exception 'You can rate a job once it is done'; end if;
  if new.status <> old.status or new.quote is distinct from old.quote or new.pro_id is distinct from old.pro_id
     or new.customer_id <> old.customer_id then
    raise exception 'Customers can only add a rating and review';
  end if;
  return new;
end $$;
create trigger guard_request_update before update on public.requests
  for each row execute function public.guard_request_update();

create policy "anyone reads rates" on public.rates for select using (true);
create policy "admin writes rates" on public.rates for all using (public.is_admin()) with check (public.is_admin());
create policy "anyone reads settings" on public.settings for select using (true);
create policy "admin writes settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------- shared numbers without exposing anyone's job
-- "What neighbours paid": totals from completed jobs, grouped, no names or numbers
create or replace function public.price_stats() returns table (category text, jobs bigint, labour_median numeric, materials_median numeric, total_low numeric, total_high numeric, includes_examples boolean)
language sql stable security definer set search_path = public as $$
  with t as (
    select r.category, r.example,
      coalesce((r.quote->>'callout')::numeric,0) + coalesce((select sum((l->>'amount')::numeric) from jsonb_array_elements(coalesce(r.quote->'labour','[]')) l),0) as labour,
      coalesce((select sum((m->>'qty')::numeric * (m->>'unit')::numeric) from jsonb_array_elements(coalesce(r.quote->'materials','[]')) m),0) as materials
    from public.requests r where r.status = 'done' and r.quote is not null)
  select category, count(*), percentile_cont(0.5) within group (order by labour)::numeric,
         percentile_cont(0.5) within group (order by materials)::numeric,
         min(labour+materials), max(labour+materials), bool_or(example)
  from t group by category order by count(*) desc;
$$;

-- reference prices for parts, from receipts on completed jobs
create or replace function public.material_stats() returns table (item text, times bigint, unit_low numeric, unit_high numeric)
language sql stable security definer set search_path = public as $$
  select concat_ws(', ', m->>'item', nullif(m->>'spec','')) as item, count(*), min((m->>'unit')::numeric), max((m->>'unit')::numeric)
  from public.requests r, jsonb_array_elements(coalesce(r.quote->'materials','[]')) m
  where r.status = 'done' group by 1 order by 1;
$$;

-- ratings and job counts per pro
create or replace function public.pro_stats() returns table (pro_id uuid, jobs bigint, rating numeric)
language sql stable security definer set search_path = public as $$
  select pro_id, count(*) filter (where status = 'done'), round(avg(rating)::numeric, 1)
  from public.requests where pro_id is not null and not example group by pro_id;
$$;

-- admin: approve an application and list the pro
create or replace function public.approve_application(app_id uuid, licence_checked boolean, references_checked boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare a public.applications; new_id uuid; k text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not (licence_checked and references_checked) then raise exception 'Check the licence and references first'; end if;
  select * into a from public.applications where id = app_id and status = 'pending';
  if a.id is null then raise exception 'Application not found or already reviewed'; end if;
  k := case when a.trade = 'Supplier' then 'supplier' when a.trade in ('Upholstery','Carpentry') then 'design' else 'repair' end;
  insert into public.pros (user_id, name, kind, trade, trades, areas, licence_type, licence_checked, note)
  values (a.user_id, a.name, k, a.trade,
          case when k = 'design' then array[a.trade, 'Furniture & design'] else array[a.trade] end,
          a.areas, nullif(a.licence_type,''), case when nullif(a.licence_type,'') is not null then current_date end, a.prices_text)
  returning id into new_id;
  update public.applications set status = 'approved', reviewed_at = now() where id = app_id;
  update public.profiles set role = 'pro', name = coalesce(name, a.name), phone = coalesce(phone, a.phone) where id = a.user_id and role = 'customer';
  return new_id;
end $$;

grant execute on function public.price_stats(), public.material_stats(), public.pro_stats() to anon, authenticated;
grant execute on function public.approve_application(uuid, boolean, boolean) to authenticated;

-- ---------- account deletion (required by the App Store for apps with sign-up)
-- Deletes the signed-in user. Their profile, applications and requests go with them (on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- lock down trigger functions (flagged by Supabase's security advisor)
-- Triggers still fire; the functions just can't be called directly from the API.
revoke execute on function public.guard_request_update() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.approve_application(uuid, boolean, boolean) from anon;
