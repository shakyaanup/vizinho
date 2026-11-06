begin;
\ir _helpers.psql

select plan(28);

select tests.create_user('hana@test.local', '{"full_name": "Hana Applicant"}') as hana \gset
select tests.create_user('rui@test.local', '{"full_name": "Rui Reapplies"}') as rui \gset
select tests.create_user('carl@test.local', '{"full_name": "Carl Customer"}') as carl \gset
select tests.create_user('adam@test.local', '{"full_name": "Adam Admin"}') as adam \gset
select tests.create_user('olga@test.local', '{"full_name": "Olga Admin-Host"}') as olga \gset
select tests.make_admin(:'adam');
select tests.make_admin(:'olga');

-- --- Applicant: submit only a complete application --------------------------------
select tests.authenticate_as(:'hana');

select throws_ok($$ select public.submit_host_application('2026-11') $$,
  'P0002', null, 'cannot submit without an application');

insert into public.host_profiles (display_name) values ('Hana''s Corner');

select throws_ok($$ select public.submit_host_application('2026-11') $$,
  '22023', 'Application is missing the area', 'the area is required');

update public.host_profiles set area_label = 'Arroios, Lisboa' where user_id = auth.uid();

select throws_ok($$ select public.submit_host_application('2026-11') $$,
  '22023', 'Application is missing the address', 'the address is required');

insert into public.host_private_details (host_id, address_line1, postal_code, city, exact_location)
select id, 'Rua de Arroios 10', '1150-054', 'Lisboa',
       extensions.st_setsrid(extensions.st_makepoint(-9.1349, 38.7316), 4326)::extensions.geography
  from public.host_profiles where user_id = auth.uid();

select throws_ok($$ select public.submit_host_application('2026-11') $$,
  '22023', 'Application is missing opening hours', 'opening hours are required');

insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
select id, 1, '18:00', '21:00' from public.host_profiles where user_id = auth.uid();

select throws_ok($$ select public.submit_host_application('') $$,
  '22023', null, 'the agreement version is validated');

select lives_ok($$ select public.submit_host_application('2026-11') $$,
  'a complete application can be submitted');

select is((select status::text from public.host_profiles where user_id = auth.uid()), 'pending_review',
  'the application is now pending review');

select throws_ok($$ select public.submit_host_application('2026-11') $$,
  '55000', null, 'a pending application cannot be submitted twice');

select throws_ok(
  format($$ select public.admin_review_host(%L, 'approve') $$,
    (select id from public.host_profiles where user_id = auth.uid())),
  '42501', null, 'applicants cannot approve themselves');
reset role;

select id as hana_host from public.host_profiles where user_id = :'hana' \gset

select ok(exists (select 1 from public.legal_acceptances
                   where user_id = :'hana' and document = 'host_agreement' and version = '2026-11'),
  'submitting records the host agreement acceptance');

select ok(exists (select 1 from public.audit_logs
                   where action = 'host.application_submitted' and target_id = :'hana_host'
                     and actor_id = :'hana'),
  'the submission is audited');

select is((select count(*)::int from public.notifications
            where type = 'host.application_submitted' and user_id in (:'adam', :'olga')
              and payload ->> 'host_id' = :'hana_host'),
  2, 'every admin is notified of the new application');

-- --- Customers cannot review --------------------------------------------------------
select tests.authenticate_as(:'carl');
select throws_ok(format($$ select public.admin_review_host(%L, 'approve') $$, :'hana_host'),
  '42501', null, 'customers cannot review hosts');
reset role;

-- --- Admin decisions ---------------------------------------------------------------
select tests.authenticate_as(:'adam');

select throws_ok(format($$ select public.admin_review_host(%L, 'reject', '  ') $$, :'hana_host'),
  '22023', null, 'rejecting requires a note');

select throws_ok(format($$ select public.admin_review_host(%L, 'suspend', 'x') $$, :'hana_host'),
  '55000', null, 'a pending application cannot be suspended');

select is(public.admin_review_host(:'hana_host', 'approve'), 'approved'::public.host_status,
  'an admin can approve a pending application');

select throws_ok(format($$ select public.admin_review_host(%L, 'approve') $$, :'hana_host'),
  '55000', null, 'an approved host cannot be approved again');
reset role;

select ok(exists (select 1 from public.user_roles where user_id = :'hana' and role = 'host'),
  'approval grants the host role');

select is((select reviewed_by from public.host_profiles where id = :'hana_host'), :'adam'::uuid,
  'the reviewer is recorded');

select ok(exists (select 1 from public.notifications where user_id = :'hana' and type = 'host.approved'),
  'the applicant is notified of the approval');

select ok(exists (select 1 from public.audit_logs
                   where action = 'host.approved' and target_id = :'hana_host' and actor_id = :'adam'),
  'the approval is audited with the admin as actor');

select tests.authenticate_as(:'adam');
select is(public.admin_review_host(:'hana_host', 'suspend', 'Repeated missed pickups'),
  'suspended'::public.host_status, 'an admin can suspend an approved host');
reset role;

select ok(exists (select 1 from public.user_roles where user_id = :'hana' and role = 'host'),
  'suspension keeps the host role (parcels may still need handing over)');

select tests.authenticate_as(:'adam');
select is(public.admin_review_host(:'hana_host', 'reinstate'), 'approved'::public.host_status,
  'an admin can reinstate a suspended host');
reset role;

-- --- Rejection and resubmission ----------------------------------------------------
insert into public.host_profiles (user_id, display_name, area_label, status)
values (:'rui', 'Rui in Graça', 'Graça, Lisboa', 'pending_review')
returning id as rui_host \gset
insert into public.host_private_details (host_id, address_line1, postal_code, city, exact_location)
values (:'rui_host', 'Rua da Graça 1', '1170-168', 'Lisboa',
        extensions.st_setsrid(extensions.st_makepoint(-9.130, 38.716), 4326)::extensions.geography);
insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
values (:'rui_host', 2, '09:00', '12:00');

select tests.authenticate_as(:'adam');
select is(public.admin_review_host(:'rui_host', 'reject', 'Please add more opening hours.'),
  'rejected'::public.host_status, 'an admin can reject with a note');
reset role;

select tests.authenticate_as(:'rui');
select is((select review_note from public.host_profiles where id = :'rui_host'),
  'Please add more opening hours.', 'the applicant can read the rejection note');
select lives_ok($$ select public.submit_host_application('2026-11') $$,
  'a rejected applicant can fix and resubmit');
reset role;

-- --- Four-eyes rule ----------------------------------------------------------------
insert into public.host_profiles (user_id, display_name, area_label, status)
values (:'olga', 'Olga in Lapa', 'Lapa, Lisboa', 'pending_review')
returning id as olga_host \gset

select tests.authenticate_as(:'olga');
select throws_ok(format($$ select public.admin_review_host(%L, 'approve') $$, :'olga_host'),
  '42501', 'Admins cannot review their own listing',
  'an admin cannot approve their own listing');
reset role;

select * from finish();
rollback;
