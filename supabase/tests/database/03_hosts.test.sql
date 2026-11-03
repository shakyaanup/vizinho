begin;
\ir _helpers.psql

select plan(17);

select tests.create_user('hana@test.local', '{"full_name": "Hana"}') as hana \gset
select tests.create_user('carl@test.local', '{"full_name": "Carl"}') as carl \gset
select tests.create_user('adam@test.local', '{"full_name": "Adam Admin"}') as adam \gset
select tests.make_admin(:'adam');

-- --- Hana applies to become a host -------------------------------------------
select tests.authenticate_as(:'hana');

select lives_ok(
  $$ insert into public.host_profiles (display_name, area_label) values ('Hana''s Corner', 'Arroios, Lisboa') $$,
  'a customer can start a host application'
);

select is(
  (select status::text from public.host_profiles where user_id = :'hana'),
  'draft',
  'new applications start as draft'
);

select throws_ok(
  $$ insert into public.host_profiles (display_name, status) values ('Sneaky', 'approved') $$,
  '42501', null,
  'an applicant cannot create an already-approved profile'
);

select throws_ok(
  $$ update public.host_profiles set status = 'approved' $$,
  '42501', null,
  'an applicant cannot approve themselves'
);

select throws_ok(
  $$ update public.host_profiles
        set public_location = extensions.st_makepoint(-9.1, 38.7)::extensions.geography $$,
  '42501', null,
  'hosts cannot set their public map location directly'
);

select lives_ok(
  $$ insert into public.host_private_details (host_id, address_line1, postal_code, city, exact_location)
     select id, 'Rua de Arroios 10', '1150-054', 'Lisboa',
            extensions.st_setsrid(extensions.st_makepoint(-9.13487, 38.73162), 4326)::extensions.geography
       from public.host_profiles where user_id = auth.uid() $$,
  'a host can save their private address'
);

select throws_ok(
  $$ update public.host_private_details set postal_code = '1150' $$,
  '23514', null,
  'Portuguese postal code format is enforced'
);

reset role;

-- --- Location privacy ----------------------------------------------------------------
select ok(
  (select not extensions.st_equals(h.public_location::extensions.geometry, d.exact_location::extensions.geometry)
     from public.host_profiles h join public.host_private_details d on d.host_id = h.id
    where h.user_id = :'hana'),
  'the public location is not the exact location'
);

select ok(
  (select extensions.st_distance(h.public_location, d.exact_location) < 320
     from public.host_profiles h join public.host_private_details d on d.host_id = h.id
    where h.user_id = :'hana'),
  'the public location stays within the snapped grid cell (< 320 m)'
);

-- --- Before approval, nobody else sees the application ------------------------------
select tests.authenticate_as(:'carl');
select is_empty(format($$ select id from public.host_profiles where user_id = %L $$, :'hana'),
  'draft hosts are not listed to customers');
reset role;

-- Admin approves (the approval RPC arrives in Phase 2).
update public.host_profiles set status = 'approved' where user_id = :'hana';
insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
  select id, 1, '09:00', '18:00' from public.host_profiles where user_id = :'hana';
insert into public.host_time_off (host_id, starts_at, ends_at, reason)
  select id, now() + interval '1 day', now() + interval '3 days', 'Holiday'
    from public.host_profiles where user_id = :'hana';

-- --- After approval -------------------------------------------------------------------
select tests.authenticate_as(:'carl');

select results_eq(
  format($$ select display_name from public.host_profiles where user_id = %L $$, :'hana'),
  $$ values ('Hana''s Corner'::text) $$,
  'approved hosts are listed to customers'
);

select is_empty($$ select host_id from public.host_private_details $$,
  'customers can never read a host''s private address');

select results_eq(
  format($$ select count(*)::int from public.host_weekly_hours h
            join public.host_profiles p on p.id = h.host_id where p.user_id = %L $$, :'hana'),
  $$ values (1) $$,
  'customers can see an approved host''s opening hours');

select is_empty($$ select id from public.host_time_off $$,
  'customers cannot see a host''s private time off');

select throws_ok(
  $$ insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
     select id, 6, '10:00', '12:00' from public.host_profiles $$,
  '42501', null,
  'customers cannot edit another host''s schedule'
);

reset role;

select tests.authenticate_as(:'adam');
select results_eq(
  format($$ select count(*)::int from public.host_private_details d
            join public.host_profiles p on p.id = d.host_id where p.user_id = %L $$, :'hana'),
  $$ values (1) $$,
  'admins can read private host details');
select results_eq(
  format($$ select count(*)::int from public.host_time_off t
            join public.host_profiles p on p.id = t.host_id where p.user_id = %L $$, :'hana'),
  $$ values (1) $$,
  'admins can read host time off');
reset role;

select * from finish();
rollback;
