-- Run after rls_test.sql's setup section (it reuses its users and harness).
\set QUIET on
\i supabase/provider.sql
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
-- fresh job and a second pro in another trade
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.requests (name, area, category, description, phone) values ('Raj','Bedok','Plumbing','Choked sink','98887777');
insert into public.requests (name, area, category, description, phone) values ('Raj','Tampines','Plumbing','Leak elsewhere','98887777');
reset role;
\set QUIET off
\echo '--- pro sees open plumbing jobs in Bedok only, with no name or phone columns'
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select job_name, category, area, description, interested from public.open_jobs_for_me();
\echo '--- pro registers interest (should work), then sees interested = true'
insert into public.job_interest (request_id, pro_id) select id, (select id from public.pros where user_id = auth.uid()) from public.open_jobs_for_me();
select description, interested from public.open_jobs_for_me();
\echo '--- pro still cannot read the customer row itself (should see 0 new requests)'
select count(*) as pro_sees_unassigned from public.requests where status='new';
\echo '--- pro updates own availability and areas (should work)'
select public.update_my_pro(false, array['Bedok','Simei'], 'At cost', '[{"job":"Choked sink","low":80,"high":120}]');
select available, areas, materials_policy from public.pros where user_id = auth.uid();
\echo '--- customer tries to register interest (should fail)'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.job_interest (request_id, pro_id) select id, (select id from public.pros limit 1) from public.requests limit 1;
\echo '--- customer calls open_jobs_for_me (should return nothing)'
select count(*) as cust_open_jobs from public.open_jobs_for_me();
\echo '--- admin sees the interest'
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select count(*) as admin_sees_interest from public.job_interest;
reset role;
