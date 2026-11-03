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
