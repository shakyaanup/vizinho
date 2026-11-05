-- =============================================================================
-- Local development seed: MOCK DATA ONLY. Runs on `pnpm db:reset`.
--
-- Demo accounts (password for all three: VizinhoDemo2026)
--   customer@demo.vizinho.app  Carla Costa    customer
--   host@demo.vizinho.app      Hugo Martins   customer + host (approved, Arroios)
--   admin@demo.vizinho.app     Ana Admin      customer + admin
--
-- These credentials are intentionally public: they back the one-click
-- "Try as ..." buttons for portfolio reviewers. Never reuse them in production.
-- =============================================================================

-- Fixed ids keep links and tests stable across resets:
--   customer 11111111-…, host 22222222-…, admin 33333333-…, host profile 44444444-…

-- -----------------------------------------------------------------------------
-- Auth users. Supabase Auth needs both auth.users and auth.identities rows for
-- email/password sign-in. Empty strings (not NULL) for the token columns are
-- required by the Auth server.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.email, extensions.crypt('VizinhoDemo2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('full_name', u.full_name, 'locale', 'en', 'terms_version', '2026-11'),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111', 'customer@demo.vizinho.app', 'Carla Costa'),
  ('22222222-2222-4222-8222-222222222222',     'host@demo.vizinho.app',     'Hugo Martins'),
  ('33333333-3333-4333-8333-333333333333',    'admin@demo.vizinho.app',    'Ana Admin')
) as u (id, email, full_name);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333');

-- The sign-up trigger already created profiles, the customer role and the
-- legal acceptances. Add the extra roles.
insert into public.user_roles (user_id, role) values
  ('22222222-2222-4222-8222-222222222222', 'host'),
  ('33333333-3333-4333-8333-333333333333', 'admin');

update public.profiles set phone_e164 = '+351912345678' where id = '11111111-1111-4111-8111-111111111111';

-- -----------------------------------------------------------------------------
-- Demo host: an approved neighbor in Arroios, Lisbon.
-- -----------------------------------------------------------------------------
insert into public.host_profiles (
  id, user_id, host_type, status, display_name, area_label, rules_text,
  max_parcel_size, max_declared_value_cents, max_concurrent_parcels,
  reviewed_by, reviewed_at, terms_version, terms_accepted_at
) values (
  '44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'individual', 'approved',
  'Hugo in Arroios', 'Arroios, Lisboa',
  'Ring the bell for 2nd floor. Parcels kept for up to 7 days. No food or fragile items.',
  'medium', 30000, 6,
  '33333333-3333-4333-8333-333333333333', now(), '2026-11', now()
);

-- Exact location stays private; the trigger snaps the public map pin.
insert into public.host_private_details (host_id, address_line1, address_line2, postal_code, city, exact_location, access_instructions)
values (
  '44444444-4444-4444-8444-444444444444',
  'Rua de Arroios 42', '2º Esq.', '1150-054', 'Lisboa',
  extensions.st_setsrid(extensions.st_makepoint(-9.13487, 38.73162), 4326)::extensions.geography,
  'Buzzer "Martins". Weekdays after 18:00, Saturdays all day.'
);

-- Weekday evenings (Mon–Fri) and all of Saturday.
insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
select '44444444-4444-4444-8444-444444444444', h.weekday, h.opens_at, h.closes_at
from (
  select d::smallint as weekday, time '18:00' as opens_at, time '21:00' as closes_at
  from generate_series(1, 5) d
  union all
  select 6::smallint, time '10:00', time '19:00'
) h;

-- =============================================================================
-- Mock network: 20 more hosts across Lisbon, three extra customers and a set of
-- reservations in different states, so every dashboard and (later) the map has
-- something to show. People, shops and addresses are invented; coordinates are
-- on real streets so the map looks plausible.
--
-- Mock accounts get a random, unknown password: only the three demo accounts
-- above can sign in.
--
-- The reservation rows below are inserted directly because the seed runs as
-- the database owner and describes a past that already happened. In the app,
-- every one of these transitions goes through an RPC that writes the matching
-- custody event; the seed writes the same events by hand to stay consistent.
--
-- Fixed id prefixes: host owners aaaaaaaa-…, host profiles bbbbbbbb-…,
-- customers cccccccc-…, reservations dddddddd-…, parcels eeeeeeee-…
-- =============================================================================

create temporary table mock_hosts (
  n             int primary key,
  owner_name    text,
  host_type     public.host_type,
  business_name text,
  display_name  text,
  area_label    text,
  status        public.host_status,
  address_line1 text,
  postal_code   text,
  lng           float8,
  lat           float8,
  max_size      public.parcel_size,
  max_value     int,
  capacity      int,
  hours         text,  -- shop | evenings | daytime | weekend
  rules_text    text
);

insert into mock_hosts values
  ( 1, 'Marta Ribeiro',   'individual', null,                  'Marta in Alfama',           'Alfama, Lisboa',            'approved',       'Rua de São Miguel 12',            '1100-544', -9.13052, 38.71148, 'small',  15000,  3, 'evenings', 'Third floor, no lift, so small parcels only.'),
  ( 2, 'Joaquim Sousa',   'business',   'Papelaria Sousa',     'Papelaria Sousa',           'Baixa, Lisboa',             'approved',       'Rua dos Fanqueiros 120',          '1100-232', -9.13581, 38.71102, 'medium', 30000, 15, 'shop',     'Ask at the counter. Parcels are kept for 7 days.'),
  ( 3, 'Inês Carvalho',   'individual', null,                  'Inês in Bairro Alto',       'Bairro Alto, Lisboa',       'approved',       'Rua da Rosa 85',                  '1200-382', -9.14452, 38.71297, 'small',  10000,  2, 'evenings', 'Evenings only. Please message before coming.'),
  ( 4, 'Pedro Antunes',   'individual', null,                  'Pedro in Príncipe Real',    'Príncipe Real, Lisboa',     'approved',       'Rua da Escola Politécnica 60',    '1250-102', -9.14876, 38.71658, 'medium', 20000,  4, 'daytime',  'I work from home on weekdays.'),
  ( 5, 'Luísa Pereira',   'business',   'Florista Avenida',    'Florista Avenida',          'Avenidas Novas, Lisboa',    'approved',       'Avenida da República 40',         '1050-195', -9.14598, 38.73947, 'medium', 25000, 10, 'shop',     'Collect from the flower shop counter.'),
  ( 6, 'Beatriz Gomes',   'individual', null,                  'Beatriz in Alvalade',       'Alvalade, Lisboa',          'approved',       'Avenida da Igreja 22',            '1700-235', -9.14402, 38.75303, 'large',  50000,  6, 'daytime',  'Ground floor with space for larger boxes.'),
  ( 7, 'Manuel Rocha',    'business',   'Mercearia Rocha',     'Mercearia Rocha',           'Campo de Ourique, Lisboa',  'approved',       'Rua Ferreira Borges 70',          '1350-131', -9.16398, 38.71806, 'medium', 20000, 12, 'shop',     'Family grocery. No perishable items.'),
  ( 8, 'Catarina Dias',   'individual', null,                  'Catarina in Estrela',       'Estrela, Lisboa',           'approved',       'Rua de São Bento 300',            '1200-822', -9.15947, 38.71296, 'small',  15000,  3, 'weekend',  'Weekends and Friday evenings.'),
  ( 9, 'Fernando Lima',   'business',   'Café Belém Rio',      'Café Belém Rio',            'Belém, Lisboa',             'approved',       'Rua de Belém 90',                 '1300-085', -9.20396, 38.69751, 'medium', 20000,  8, 'shop',     'Ask any of the staff at the café.'),
  (10, 'Sara Mendes',     'individual', null,                  'Sara in Alcântara',         'Alcântara, Lisboa',         'approved',       'Rua de Cascais 15',               '1300-111', -9.17803, 38.70451, 'medium', 20000,  4, 'evenings', 'Ring the second bell.'),
  (11, 'António Silva',   'individual', null,                  'António in Graça',          'Graça, Lisboa',             'approved',       'Rua da Graça 120',                '1170-168', -9.13004, 38.71652, 'medium', 20000,  5, 'daytime',  'Retired and home most of the day.'),
  (12, 'Joana Teixeira',  'individual', null,                  'Joana in Penha de França',  'Penha de França, Lisboa',   'approved',       'Rua Morais Soares 50',            '1900-342', -9.12653, 38.72698, 'small',  10000,  3, 'evenings', 'Small parcels, collected after work.'),
  (13, 'Ricardo Faria',   'business',   'Lavandaria Areeiro',  'Lavandaria Areeiro',        'Areeiro, Lisboa',           'approved',       'Avenida de Paris 8',              '1000-228', -9.13405, 38.74247, 'large',  40000, 20, 'shop',     'Large back room. Parcels kept for 7 days.'),
  (14, 'Helena Correia',  'business',   'Quiosque Oceanos',    'Quiosque Oceanos',          'Parque das Nações, Lisboa', 'approved',       'Alameda dos Oceanos 30',          '1990-208', -9.09503, 38.76851, 'medium', 30000, 15, 'shop',     'Kiosk next to the metro exit.'),
  (15, 'Nuno Barbosa',    'individual', null,                  'Nuno in Benfica',           'Benfica, Lisboa',           'approved',       'Estrada de Benfica 500',          '1500-110', -9.19902, 38.74903, 'large',  30000,  5, 'daytime',  'House with a garage, larger boxes welcome.'),
  (16, 'Teresa Pinto',    'individual', null,                  'Teresa in Lumiar',          'Lumiar, Lisboa',            'approved',       'Alameda das Linhas de Torres 150','1750-149', -9.15904, 38.77198, 'medium', 20000,  4, 'evenings', 'Weekday evenings and Saturday mornings.'),
  (17, 'Diogo Moreira',   'individual', null,                  'Diogo in Campo Grande',     'Campo Grande, Lisboa',      'approved',       'Avenida do Brasil 60',            '1700-071', -9.14605, 38.75700, 'small',  15000,  3, 'weekend',  'Mostly weekends.'),
  (18, 'Mariana Lopes',   'individual', null,                  'Mariana in Marvila',        'Marvila, Lisboa',           'pending_review', 'Rua do Açúcar 40',                '1950-009', -9.10598, 38.74497, 'medium', 20000,  4, 'evenings', 'New in the neighbourhood, happy to help.'),
  (19, 'Gonçalo Ramos',   'business',   'Sapataria dos Anjos', 'Sapataria dos Anjos',       'Anjos, Lisboa',             'pending_review', 'Rua dos Anjos 60',                '1150-039', -9.13502, 38.72548, 'medium', 20000, 10, 'shop',     'Shoe repair shop. Ask at the counter.'),
  (20, 'Vasco Henriques', 'individual', null,                  'Vasco in Santos',           'Santos, Lisboa',            'suspended',      'Rua da Esperança 100',            '1200-655', -9.15603, 38.70749, 'small',  10000,  2, 'evenings', 'Evenings only.');

-- Host owners and extra customers. The sign-up trigger creates their profiles,
-- customer role and legal acceptances, just like for real sign-ups.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf', 4)), now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('full_name', u.full_name, 'locale', 'pt-PT', 'terms_version', '2026-11'),
  now() - u.joined, now(), '', '', '', ''
from (
  select format('aaaaaaaa-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
         format('host%s@mock.vizinho.app', lpad(n::text, 2, '0')),
         owner_name,
         make_interval(days => 20 + n * 4)
    from mock_hosts
  union all
  select format('cccccccc-0000-4000-8000-%s', lpad(c.n::text, 12, '0'))::uuid,
         format('customer%s@mock.vizinho.app', lpad(c.n::text, 2, '0')),
         c.full_name,
         make_interval(days => 10 * c.n)
    from (values (1, 'Rui Almeida'), (2, 'Sofia Ferreira'), (3, 'Tiago Lopes')) as c (n, full_name)
) as u (id, email, full_name, joined);

-- Hosts get the host role once approved (suspension keeps the role; the
-- listing itself is hidden).
insert into public.user_roles (user_id, role)
select format('aaaaaaaa-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid, 'host'
  from mock_hosts
 where status in ('approved', 'suspended');

insert into public.host_profiles (
  id, user_id, host_type, status, display_name, business_name, area_label, rules_text,
  max_parcel_size, max_declared_value_cents, max_concurrent_parcels,
  review_note, reviewed_by, reviewed_at, terms_version, terms_accepted_at, created_at
)
select
  format('bbbbbbbb-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
  format('aaaaaaaa-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
  host_type, status, display_name, business_name, area_label, rules_text,
  max_size, max_value, capacity,
  case when status = 'suspended' then 'Suspended after repeated missed pickups (mock data).' end,
  case when status <> 'pending_review' then '33333333-3333-4333-8333-333333333333'::uuid end,
  case when status <> 'pending_review' then now() - make_interval(days => 15 + n) end,
  '2026-11', now() - make_interval(days => 18 + n * 4),
  now() - make_interval(days => 18 + n * 4)
from mock_hosts;

-- Private addresses; the trigger fills each public_location with a snapped pin.
insert into public.host_private_details (host_id, address_line1, postal_code, city, exact_location)
select
  format('bbbbbbbb-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
  address_line1, postal_code, 'Lisboa',
  extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
from mock_hosts;

-- Opening hours by pattern (ISO weekdays: 1 = Monday … 7 = Sunday).
insert into public.host_weekly_hours (host_id, weekday, opens_at, closes_at)
select format('bbbbbbbb-0000-4000-8000-%s', lpad(m.n::text, 12, '0'))::uuid,
       p.weekday, p.opens_at, p.closes_at
from mock_hosts m
join (
  select 'shop' as hours, d::smallint as weekday, time '09:00' as opens_at, time '19:00' as closes_at
    from generate_series(1, 6) d
  union all
  select 'evenings', d::smallint, time '18:00', time '21:00' from generate_series(1, 5) d
  union all
  select 'evenings', 6::smallint, time '10:00', time '13:00'
  union all
  select 'daytime', d::smallint, time '09:00', time '18:00' from generate_series(1, 5) d
  union all
  select 'weekend', 5::smallint, time '17:00', time '21:00'
  union all
  select 'weekend', 6::smallint, time '10:00', time '19:00'
  union all
  select 'weekend', 7::smallint, time '10:00', time '14:00'
) p on p.hours = m.hours;

-- Catarina is away next week.
insert into public.host_time_off (host_id, starts_at, ends_at, reason)
values ('bbbbbbbb-0000-4000-8000-000000000008',
        date_trunc('day', now()) + interval '5 days',
        date_trunc('day', now()) + interval '12 days',
        'Holiday');

insert into public.audit_logs (actor_id, action, target_table, target_id, details, created_at)
select '33333333-3333-4333-8333-333333333333',
       case when status = 'suspended' then 'host.suspended' else 'host.approved' end,
       'host_profiles',
       format('bbbbbbbb-0000-4000-8000-%s', lpad(n::text, 12, '0')),
       '{"source": "seed"}',
       now() - make_interval(days => 15 + n)
  from mock_hosts
 where status in ('approved', 'suspended');

drop table mock_hosts;

-- -----------------------------------------------------------------------------
-- Reservations. Times are relative to now() so the demo always looks current.
--   1 Carla → Hugo        requested        (Hugo has a request to answer)
--   2 Carla → Beatriz     accepted         (address revealed, waiting for delivery)
--   3 Carla → Florista    awaiting_pickup  (parcel arrived this morning)
--   4 Carla → Hugo        collected        (history + Hugo's earning)
--   5 Rui   → Hugo        awaiting_pickup  (a parcel in Hugo's storage)
--   6 Sofia → Papelaria   awaiting_pickup  with an open "damaged" incident
--   7 Tiago → Papelaria   declined
--   8 Tiago → Lavandaria  cancelled by the customer
-- -----------------------------------------------------------------------------
insert into public.reservations (
  id, reference_code, customer_id, host_id, status, expected_delivery_date,
  merchant_name, declared_size, declared_value_cents, customer_note,
  decline_reason, cancel_reason, prohibited_items_attested_at,
  responded_at, expires_at, cancelled_at, completed_at, has_open_incident, created_at
) values
  ('dddddddd-0000-4000-8000-000000000001', 'VZ-RQ7H2K', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444',
   'requested', current_date + 3, null, 'small', 2500, 'A paperback book in a small box.',
   null, null, now() - interval '2 hours', null, now() + interval '22 hours', null, null, false, now() - interval '2 hours'),
  ('dddddddd-0000-4000-8000-000000000002', 'VZ-AC4M9P', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000006',
   'accepted', current_date + 1, 'Online electronics shop', 'medium', 8900, null,
   null, null, now() - interval '1 day', now() - interval '20 hours', now() + interval '3 days', null, null, false, now() - interval '1 day'),
  ('dddddddd-0000-4000-8000-000000000003', 'VZ-WP8T3N', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000005',
   'awaiting_pickup', current_date, 'Clothing store', 'small', 4500, null,
   null, null, now() - interval '3 days', now() - interval '71 hours', now() + interval '7 days', null, null, false, now() - interval '3 days'),
  ('dddddddd-0000-4000-8000-000000000004', 'VZ-CL5X6D', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444',
   'collected', current_date - 10, null, 'medium', 6000, 'Running shoes.',
   null, null, now() - interval '12 days', now() - interval '12 days' + interval '3 hours', null, null, now() - interval '9 days', false, now() - interval '12 days'),
  ('dddddddd-0000-4000-8000-000000000005', 'VZ-ST3G7B', 'cccccccc-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444',
   'awaiting_pickup', current_date - 1, null, 'medium', 4000, null,
   null, null, now() - interval '2 days', now() - interval '46 hours', now() + interval '6 days', null, null, false, now() - interval '2 days'),
  ('dddddddd-0000-4000-8000-000000000006', 'VZ-NC9F4R', 'cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002',
   'awaiting_pickup', current_date - 1, 'Home decor shop', 'medium', 12000, 'A ceramic vase, please keep it upright.',
   null, null, now() - interval '4 days', now() - interval '4 days' + interval '1 hour', now() + interval '6 days', null, null, true, now() - interval '4 days'),
  ('dddddddd-0000-4000-8000-000000000007', 'VZ-DK2V8M', 'cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002',
   'declined', current_date - 3, null, 'large', 20000, null,
   'Fully booked that week, sorry.', null, now() - interval '5 days', now() - interval '5 days' + interval '1 hour', null, null, null, false, now() - interval '5 days'),
  ('dddddddd-0000-4000-8000-000000000008', 'VZ-CX6B3W', 'cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000013',
   'cancelled', current_date - 2, null, 'large', 15000, null,
   null, 'Changed the delivery to my office.', now() - interval '6 days', now() - interval '6 days' + interval '2 hours', null, now() - interval '4 days', null, false, now() - interval '6 days');

insert into public.parcels (id, reservation_id, status, size, received_at, received_by, collected_at, handed_over_by) values
  ('eeeeeeee-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000003', 'received',  'small',  now() - interval '3 hours', 'aaaaaaaa-0000-4000-8000-000000000005', null, null),
  ('eeeeeeee-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000004', 'collected', 'medium', now() - interval '10 days', '22222222-2222-4222-8222-222222222222', now() - interval '9 days', '22222222-2222-4222-8222-222222222222'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'dddddddd-0000-4000-8000-000000000005', 'received',  'medium', now() - interval '1 day',   '22222222-2222-4222-8222-222222222222', null, null),
  ('eeeeeeee-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000006', 'received',  'medium', now() - interval '1 day',   'aaaaaaaa-0000-4000-8000-000000000002', null, null);

-- The collected reservation used a pickup code. Only random hashes are stored,
-- so the code itself never existed in plaintext.
insert into public.pickup_tokens (reservation_id, token_hash, pin_hash, expires_at, used_at, created_at)
values ('dddddddd-0000-4000-8000-000000000004',
        extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
        extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
        now() - interval '9 days' + interval '1 hour', now() - interval '9 days', now() - interval '9 days' - interval '10 minutes');

-- Chain of custody for each reservation, matching its current status.
insert into public.custody_events (reservation_id, parcel_id, event_type, actor_id, actor_role, occurred_at, metadata)
select e.reservation_id::uuid, e.parcel_id::uuid, e.event_type::public.custody_event_type,
       e.actor_id::uuid, e.actor_role::public.actor_role, now() - e.ago::interval, e.metadata::jsonb
from (values
  -- 1 requested
  ('dddddddd-0000-4000-8000-000000000001', null, 'reservation_requested', '11111111-1111-4111-8111-111111111111', 'customer', '2 hours',              '{}'),
  -- 2 accepted
  ('dddddddd-0000-4000-8000-000000000002', null, 'reservation_requested', '11111111-1111-4111-8111-111111111111', 'customer', '1 day',                '{}'),
  ('dddddddd-0000-4000-8000-000000000002', null, 'reservation_accepted',  'aaaaaaaa-0000-4000-8000-000000000006', 'host',     '20 hours',             '{}'),
  ('dddddddd-0000-4000-8000-000000000002', null, 'address_viewed',        '11111111-1111-4111-8111-111111111111', 'customer', '19 hours',             '{}'),
  -- 3 awaiting pickup
  ('dddddddd-0000-4000-8000-000000000003', null, 'reservation_requested', '11111111-1111-4111-8111-111111111111', 'customer', '3 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000003', null, 'reservation_accepted',  'aaaaaaaa-0000-4000-8000-000000000005', 'host',     '71 hours',             '{}'),
  ('dddddddd-0000-4000-8000-000000000003', null, 'address_viewed',        '11111111-1111-4111-8111-111111111111', 'customer', '70 hours',             '{}'),
  ('dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000003', 'parcel_checked_in', 'aaaaaaaa-0000-4000-8000-000000000005', 'host', '3 hours', '{}'),
  -- 4 collected
  ('dddddddd-0000-4000-8000-000000000004', null, 'reservation_requested', '11111111-1111-4111-8111-111111111111', 'customer', '12 days',              '{}'),
  ('dddddddd-0000-4000-8000-000000000004', null, 'reservation_accepted',  '22222222-2222-4222-8222-222222222222', 'host',     '11 days 21 hours',     '{}'),
  ('dddddddd-0000-4000-8000-000000000004', null, 'address_viewed',        '11111111-1111-4111-8111-111111111111', 'customer', '11 days 20 hours',     '{}'),
  ('dddddddd-0000-4000-8000-000000000004', 'eeeeeeee-0000-4000-8000-000000000004', 'parcel_checked_in',  '22222222-2222-4222-8222-222222222222', 'host',     '10 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000004', null,                                   'pickup_code_issued', '11111111-1111-4111-8111-111111111111', 'customer', '9 days 10 minutes',     '{}'),
  ('dddddddd-0000-4000-8000-000000000004', 'eeeeeeee-0000-4000-8000-000000000004', 'parcel_handed_over', '22222222-2222-4222-8222-222222222222', 'host',     '9 days',                '{"method": "pin"}'),
  -- 5 awaiting pickup at Hugo's
  ('dddddddd-0000-4000-8000-000000000005', null, 'reservation_requested', 'cccccccc-0000-4000-8000-000000000001', 'customer', '2 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000005', null, 'reservation_accepted',  '22222222-2222-4222-8222-222222222222', 'host',     '46 hours',             '{}'),
  ('dddddddd-0000-4000-8000-000000000005', null, 'address_viewed',        'cccccccc-0000-4000-8000-000000000001', 'customer', '45 hours',             '{}'),
  ('dddddddd-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000005', 'parcel_checked_in', '22222222-2222-4222-8222-222222222222', 'host', '1 day', '{}'),
  -- 6 awaiting pickup, damaged on arrival
  ('dddddddd-0000-4000-8000-000000000006', null, 'reservation_requested', 'cccccccc-0000-4000-8000-000000000002', 'customer', '4 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000006', null, 'reservation_accepted',  'aaaaaaaa-0000-4000-8000-000000000002', 'host',     '3 days 23 hours',      '{}'),
  ('dddddddd-0000-4000-8000-000000000006', null, 'address_viewed',        'cccccccc-0000-4000-8000-000000000002', 'customer', '3 days 22 hours',      '{}'),
  ('dddddddd-0000-4000-8000-000000000006', 'eeeeeeee-0000-4000-8000-000000000006', 'parcel_checked_in', 'aaaaaaaa-0000-4000-8000-000000000002', 'host', '1 day', '{}'),
  ('dddddddd-0000-4000-8000-000000000006', 'eeeeeeee-0000-4000-8000-000000000006', 'incident_opened',   'aaaaaaaa-0000-4000-8000-000000000002', 'host', '23 hours', '{"type": "damaged"}'),
  -- 7 declined
  ('dddddddd-0000-4000-8000-000000000007', null, 'reservation_requested', 'cccccccc-0000-4000-8000-000000000003', 'customer', '5 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000007', null, 'reservation_declined',  'aaaaaaaa-0000-4000-8000-000000000002', 'host',     '4 days 23 hours',      '{}'),
  -- 8 cancelled by the customer after acceptance
  ('dddddddd-0000-4000-8000-000000000008', null, 'reservation_requested', 'cccccccc-0000-4000-8000-000000000003', 'customer', '6 days',               '{}'),
  ('dddddddd-0000-4000-8000-000000000008', null, 'reservation_accepted',  'aaaaaaaa-0000-4000-8000-000000000013', 'host',     '5 days 22 hours',      '{}'),
  ('dddddddd-0000-4000-8000-000000000008', null, 'reservation_cancelled', 'cccccccc-0000-4000-8000-000000000003', 'customer', '4 days',               '{}')
) as e (reservation_id, parcel_id, event_type, actor_id, actor_role, ago, metadata);

insert into public.incidents (reservation_id, parcel_id, host_id, reported_by, type, status, description, created_at)
values ('dddddddd-0000-4000-8000-000000000006', 'eeeeeeee-0000-4000-8000-000000000006',
        'bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002',
        'damaged', 'open',
        'The box arrived with a crushed corner. I did not open it; photo taken at check-in.',
        now() - interval '23 hours');

-- Hugo earned the pickup fee for the collected parcel (integer cents, EUR).
insert into public.ledger_entries (host_id, reservation_id, entry_type, amount_cents, note, created_at)
values ('44444444-4444-4444-8444-444444444444', 'dddddddd-0000-4000-8000-000000000004',
        'earning', 150, 'Pickup fee for VZ-CL5X6D', now() - interval '9 days');

insert into public.notifications (user_id, type, payload, read_at, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'reservation.accepted', '{"reference": "VZ-AC4M9P"}', null, now() - interval '20 hours'),
  ('11111111-1111-4111-8111-111111111111', 'parcel.checked_in',    '{"reference": "VZ-WP8T3N"}', null, now() - interval '3 hours'),
  ('11111111-1111-4111-8111-111111111111', 'parcel.collected',     '{"reference": "VZ-CL5X6D"}', now() - interval '9 days', now() - interval '9 days'),
  ('22222222-2222-4222-8222-222222222222', 'reservation.requested','{"reference": "VZ-RQ7H2K"}', null, now() - interval '2 hours'),
  ('33333333-3333-4333-8333-333333333333', 'incident.opened',      '{"reference": "VZ-NC9F4R"}', null, now() - interval '23 hours');
