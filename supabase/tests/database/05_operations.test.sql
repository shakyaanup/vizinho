begin;
\ir _helpers.psql

select plan(15);

select tests.create_user('hana@test.local', '{"full_name": "Hana Host"}') as hana \gset
select tests.create_user('carl@test.local', '{"full_name": "Carl Customer"}') as carl \gset
select tests.create_user('dora@test.local', '{"full_name": "Dora Other"}') as dora \gset
select tests.create_user('adam@test.local', '{"full_name": "Adam Admin"}') as adam \gset
select tests.make_admin(:'adam');

select tests.create_approved_host(:'hana') as host \gset
select tests.create_reservation(:'carl', :'host') as res \gset

insert into public.notifications (user_id, type, payload)
values (:'carl', 'reservation.accepted', '{"reference": "VZ-TEST22"}'),
       (:'dora', 'reservation.declined', '{}');

insert into public.incidents (reservation_id, reported_by, type, description)
values (:'res', :'carl', 'damaged', 'The box arrived crushed on one corner.');

insert into public.ledger_entries (host_id, reservation_id, entry_type, amount_cents, created_by)
values (:'host', :'res', 'earning', 150, :'adam');

-- --- Notifications ---------------------------------------------------------------
select tests.authenticate_as(:'carl');

select results_eq($$ select type from public.notifications $$,
  $$ values ('reservation.accepted'::text) $$,
  'users only see their own notifications');

select lives_ok($$ update public.notifications set read_at = now() $$,
  'users can mark their notifications as read');

select throws_ok($$ update public.notifications set payload = '{}' $$,
  '42501', null,
  'users cannot rewrite notification content');

select throws_ok(
  format($$ insert into public.notifications (user_id, type) values (%L, 'fake.notice') $$, :'dora'),
  '42501', null,
  'users cannot send notifications');

-- --- Privacy requests -------------------------------------------------------------
select lives_ok($$ insert into public.privacy_requests (type) values ('export') $$,
  'users can request a data export');

select throws_ok($$ insert into public.privacy_requests (type) values ('export') $$,
  '23505', null,
  'only one open request of each type per user');

-- --- Incidents (customer side) ----------------------------------------------------
select results_eq($$ select count(*)::int from public.incidents $$, $$ values (1) $$,
  'the reporter sees their incident');

select is_empty($$ select id from public.ledger_entries $$,
  'customers cannot see host earnings');
reset role;

select tests.authenticate_as(:'dora');
select is_empty($$ select id from public.incidents $$,
  'uninvolved users cannot see incidents');
select is_empty($$ select id from public.privacy_requests $$,
  'users cannot see other people''s privacy requests');
reset role;

-- --- Host side ------------------------------------------------------------------------
select tests.authenticate_as(:'hana');
select results_eq($$ select count(*)::int from public.incidents $$, $$ values (1) $$,
  'the host sees incidents on their reservations');
select results_eq($$ select sum(amount_cents)::int from public.ledger_entries $$, $$ values (150) $$,
  'hosts see their own ledger balance');
reset role;

-- --- Ledger integrity -----------------------------------------------------------------
select throws_ok(
  $$ update public.ledger_entries set amount_cents = 99999 $$,
  'P0001', null,
  'ledger entries cannot be edited (corrections are new rows)');

select throws_ok(
  format($$ insert into public.ledger_entries (host_id, entry_type, amount_cents) values (%L, 'payout', 500) $$, :'host'),
  '23514', null,
  'payouts must be negative amounts');

select tests.authenticate_as(:'adam');
select results_eq(format($$ select count(*)::int from public.incidents where reservation_id = %L $$, :'res'),
  $$ values (1) $$,
  'admins see incidents they are not involved in');
reset role;

select * from finish();
rollback;
