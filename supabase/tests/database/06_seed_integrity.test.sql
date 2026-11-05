-- Checks the mock data in seed.sql (CI always runs on a freshly seeded
-- database). Bad demo data would otherwise only show up as a confusing UI.
begin;
\ir _helpers.psql

select plan(5);

select is(
  (select count(*)::int
     from public.host_profiles h
     join public.host_private_details d on d.host_id = h.id
    where h.public_location is null
       or extensions.st_equals(h.public_location::extensions.geometry, d.exact_location::extensions.geometry)
       or extensions.st_distance(h.public_location, d.exact_location) >= 320),
  0,
  'every seeded host has a snapped public pin, never the exact address');

select is(
  (select count(*)::int from public.host_profiles h
    where h.status = 'approved'
      and not exists (select 1 from public.host_weekly_hours w where w.host_id = h.id)),
  0,
  'every approved host has opening hours');

select is(
  (select count(*)::int from public.reservations r
    where (select count(*) from public.custody_events e
            where e.reservation_id = r.id and e.event_type = 'reservation_requested') <> 1),
  0,
  'every reservation starts with exactly one reservation_requested event');

select is(
  (select count(*)::int from public.parcels p
    where not exists (select 1 from public.custody_events e
                       where e.parcel_id = p.id and e.event_type = 'parcel_checked_in')),
  0,
  'every parcel has a check-in event in its chain of custody');

select is(
  (select count(*)::int from auth.users
    where encrypted_password = extensions.crypt('VizinhoDemo2026', encrypted_password)),
  3,
  'only the three demo accounts can sign in with the public demo password');

select * from finish();
rollback;
