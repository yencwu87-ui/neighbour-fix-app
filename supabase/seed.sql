-- Example prices and fees so the app isn't empty on first launch.
-- Every row is marked example = true and shows an "Example" tag in the app.
-- Replace them with your real pros' quotes before going public.

insert into public.settings (id, commission_pct, customer_fee, customer_fee_label, customer_fee_on, emergency_fee, plan_price, plan_includes, reno_fee, example)
values (1, 12, 4, 'Booking and job guarantee', false, 30, 299,
  array['Aircon general servicing 3 times a year, up to 3 units','One pest control treatment','One handyman visit for small jobs'],
  '5% of trade quotes, capped at S$1,500', true)
on conflict (id) do nothing;

insert into public.rates (job_id, low, high, example) values
  ('aircon-service',30,50,true),('choked-sink',80,120,true),('replace-tap',60,90,true),('light-fitting',40,70,true),
  ('curtain-rod',40,60,true),('door-lock',50,90,true),('toilet-bowl',250,450,true),('water-heater',200,400,true),
  ('aircon-leak',60,100,true),('power-points',70,110,true),('paint',180,280,true),('furniture-assembly',50,120,true),
  ('hack-tiles',20,35,true),('lights',40,70,true),('basin-tap',150,300,true),('bath-overlay',45,70,true),
  ('vinyl',30,45,true),('kitchen-cab',500,800,true),('wardrobe',450,700,true),('door',250,400,true),('clean',200,350,true)
on conflict (job_id) do nothing;

-- After you sign in to the app once, make yourself the admin (replace the email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
