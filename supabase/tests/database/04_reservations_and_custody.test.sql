begin;
\ir _helpers.psql

select plan(19);

select tests.create_user('hana@test.local', '{"full_name": "Hana Host"}') as hana \gset
select tests.create_user('carl@test.local', '{"full_name": "Carl Customer"}') as carl \gset
select tests.create_user('dora@test.local', '{"full_name": "Dora Other"}') as dora \gset
select tests.create_user('adam@test.local', '{"full_name": "Adam Admin"}') as adam \gset
select tests.make_admin(:'adam');

select tests.create_approved_host(:'hana', 'Hana''s Corner') as host \gset
select tests.create_reservation(:'carl', :'host') as res \gset

select matches(
  (select reference_code from public.reservations where id = :'res'),
  '^VZ-[A-HJ-NP-Z2-9]{6}$',
  'reservations get a readable VZ- reference code'
);

-- Record a custody event as Carl (custody events are written by RPCs as the user).
select tests.set_uid(:'carl');
select private.record_custody_event(:'res', 'reservation_requested');

select is(
  (select actor_role::text from public.custody_events where reservation_id = :'res'),
  'customer',
  'custody events record the actor''s role in the reservation'
);

select tests.set_uid(:'dora');
select throws_ok(
  format($$ select private.record_custody_event(%L, 'address_viewed') $$, :'res'),
  '42501', 'Not a party to this reservation',
  'outsiders cannot write events on someone else''s reservation'
);

-- --- Visibility -------------------------------------------------------------------
select tests.authenticate_as(:'carl');
select results_eq($$ select count(*)::int from public.reservations $$, $$ values (1) $$,
  'the customer sees their reservation');
select results_eq($$ select count(*)::int from public.custody_events $$, $$ values (1) $$,
  'the customer sees the custody trail');

-- --- Clients cannot change state directly ------------------------------------------
select throws_ok(
  format($$ update public.reservations set status = 'collected' where id = %L $$, :'res'),
  '42501', null,
  'customers cannot change reservation status directly'
);

select throws_ok(
  format($$ insert into public.reservations (customer_id, host_id, expected_delivery_date, declared_size,
            declared_value_cents, prohibited_items_attested_at)
            values (%L, %L, current_date + 1, 'small', 100, now()) $$, :'carl', :'host'),
  '42501', null,
  'reservations cannot be inserted directly (only via the request RPC)'
);

select throws_ok(
  $$ insert into public.custody_events (reservation_id, event_type, actor_role)
     select id, 'parcel_handed_over', 'host' from public.reservations $$,
  '42501', null,
  'custody events cannot be inserted directly'
);

select throws_ok(
  $$ select * from public.pickup_tokens $$,
  '42501', null,
  'pickup tokens cannot be read by clients'
);
reset role;

select tests.authenticate_as(:'hana');
select results_eq($$ select count(*)::int from public.reservations $$, $$ values (1) $$,
  'the host sees reservations at their location');
select throws_ok(
  format($$ update public.reservations set status = 'accepted' where id = %L $$, :'res'),
  '42501', null,
  'hosts cannot change reservation status directly'
);
reset role;

select tests.authenticate_as(:'dora');
select is_empty($$ select id from public.reservations $$,
  'other customers cannot see the reservation');
select is_empty($$ select id from public.custody_events $$,
  'other customers cannot see the custody trail');
reset role;

select tests.authenticate_as(:'adam');
select results_eq($$ select count(*)::int from public.reservations $$, $$ values (1) $$,
  'admins see all reservations');
reset role;

-- --- Booked hosts stay visible after suspension -------------------------------------
update public.host_profiles set status = 'suspended' where id = :'host';

select tests.authenticate_as(:'carl');
select results_eq($$ select count(*)::int from public.host_profiles $$, $$ values (1) $$,
  'a customer still sees a suspended host they booked');
reset role;

select tests.authenticate_as(:'dora');
select is_empty($$ select id from public.host_profiles $$,
  'suspended hosts are hidden from everyone else');
reset role;

-- --- Custody log is append-only for everyone, including the owner -----------------
select throws_ok(
  $$ update public.custody_events set event_type = 'parcel_handed_over' $$,
  'P0001', null,
  'custody events cannot be edited'
);

select throws_ok(
  $$ delete from public.custody_events $$,
  'P0001', null,
  'custody events cannot be deleted'
);

select throws_ok(
  $$ truncate public.custody_events cascade $$,
  'P0001', null,
  'the custody log cannot be truncated'
);

select * from finish();
rollback;
