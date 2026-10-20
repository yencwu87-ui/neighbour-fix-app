-- Local test of schema.sql access rules, with a stand-in for Supabase's auth schema.
-- Run: psql -v ON_ERROR_STOP=0 -f supabase/tests/rls_test.sql (against a throwaway database)
\set QUIET on
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema public, auth to anon, authenticated;
\i supabase/schema.sql
\i supabase/seed.sql
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a','admin@x'),('00000000-0000-0000-0000-00000000000c','cust@x'),('00000000-0000-0000-0000-00000000000d','other@x'),('00000000-0000-0000-0000-00000000000e','pro@x');
update public.profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a';

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;
\set QUIET off
\echo '--- customer books a job (should work)'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.requests (name, area, category, description, phone) values ('Mei','Bedok','Plumbing','Tap leaking','91234567');
\echo '--- customer tries to book with a quote already set (should fail)'
insert into public.requests (name, area, category, description, quote) values ('Mei','Bedok','Plumbing','x','{"callout":1}');
\echo '--- customer tries to make themselves admin (should fail or change nothing)'
update public.profiles set role='admin' where id=auth.uid();
select role as cust_role_after from public.profiles where id=auth.uid();
\echo '--- another customer reads requests (should see 0)'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as other_sees from public.requests;
\echo '--- pro applies (should work); other customer cannot read it'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.applications (name, trade, areas, phone, licence_type) values ('Seng Plumbing','Plumbing','{Bedok}','98765432','PUB licensed plumber');
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as other_sees_apps from public.applications;
\echo '--- customer tries to approve (should fail)'
select public.approve_application((select id from public.applications limit 1), true, true);
\echo '--- admin approves without checks (should fail), then with checks (should work)'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.approve_application((select id from public.applications limit 1), false, true);
select public.approve_application((select id from public.applications limit 1), true, true) is not null as approved;
select role as pro_role from public.profiles where id='00000000-0000-0000-0000-00000000000e';
\echo '--- admin matches the job to the pro'
update public.requests set pro_id=(select id from public.pros limit 1), status='matched';
\echo '--- pro sees the assigned job and sends a quote, marks done (should work)'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select count(*) as pro_sees from public.requests;
update public.requests set quote='{"callout":30,"labour":[{"desc":"Replace tap","amount":50}],"materials":[{"item":"Tap","spec":"Chrome","qty":1,"unit":65,"receipt":true}],"fees":[],"markup":""}', status='quoted';
\echo '--- pro tries to rate the job (should fail)'
update public.requests set rating=5;
update public.requests set status='done';
\echo '--- customer tries to change the quote (should fail), then rates (should work)'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
update public.requests set quote='{"callout":0}';
update public.requests set rating=4, review='Quick and tidy';
select status, rating from public.requests;
\echo '--- public price stats, no names (anon)'
reset role; select set_config('request.jwt.claim.sub','',false); set role anon; select * from public.price_stats(); select * from public.material_stats(); select * from public.pro_stats();
\echo '--- anon cannot read requests or applications'
select (select count(*) from public.requests) as anon_requests, (select count(*) from public.applications) as anon_apps;
reset role;
\echo '--- customer deletes their account (should remove their jobs too)'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.delete_my_account();
reset role;
select (select count(*) from auth.users where email='cust@x') as user_left, (select count(*) from public.requests) as requests_left;
