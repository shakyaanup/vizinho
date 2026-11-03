begin;
\ir _helpers.psql

select plan(22);

select tests.create_user('alice@test.local', '{"full_name": "Alice Silva", "locale": "pt-PT"}') as alice \gset
select tests.create_user('bob@test.local') as bob \gset
select tests.create_user('tina@test.local', '{"full_name": "Tina", "terms_version": "2026-11"}') as tina \gset
-- Attacker tries to self-assign admin through user-controlled metadata.
select tests.create_user('mallory@test.local', '{"full_name": "Mallory", "role": "admin", "app_roles": ["admin"]}') as mallory \gset
select tests.create_user('carol@test.local', '{"full_name": "Carol Admin"}') as carol \gset
select tests.make_admin(:'carol');

-- --- Sign-up trigger ---------------------------------------------------------
select results_eq(
  format($$ select full_name, locale from public.profiles where id = %L $$, :'alice'),
  $$ values ('Alice Silva'::text, 'pt-PT'::text) $$,
  'new user gets a profile with name and locale from sign-up metadata'
);

select is(
  (select full_name from public.profiles where id = :'bob'),
  'bob',
  'missing name falls back to the email local part'
);

select results_eq(
  format($$ select role::text from public.user_roles where user_id = %L $$, :'alice'),
  $$ values ('customer'::text) $$,
  'new user gets exactly the customer role'
);

select results_eq(
  format($$ select role::text from public.user_roles where user_id = %L $$, :'mallory'),
  $$ values ('customer'::text) $$,
  'roles in user metadata are ignored (no privilege escalation at sign-up)'
);

select results_eq(
  format($$ select document::text, version from public.legal_acceptances where user_id = %L order by 1 $$, :'tina'),
  $$ values ('privacy'::text, '2026-11'::text), ('terms'::text, '2026-11'::text) $$,
  'accepting the terms at sign-up records terms and privacy acceptance'
);

select is_empty(
  format($$ select 1 from public.legal_acceptances where user_id = %L $$, :'bob'),
  'no acceptance is recorded when none was given'
);

-- --- Access token hook --------------------------------------------------------
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', :'carol', 'claims', jsonb_build_object('sub', :'carol'))
  ) -> 'claims' -> 'app_roles',
  '["customer", "admin"]'::jsonb,
  'access token hook adds the user''s roles to the JWT'
);

-- --- Regular user ------------------------------------------------------------
select tests.authenticate_as(:'alice');

select results_eq(
  $$ select count(*)::int from public.profiles $$,
  $$ values (1) $$,
  'a user sees only their own profile'
);

select lives_ok(
  format($$ update public.profiles set full_name = 'Alice S.' where id = %L $$, :'alice'),
  'a user can update their own name'
);

select is_empty(
  format($$ update public.profiles set full_name = 'Hacked' where id = %L returning id $$, :'bob'),
  'a user cannot update someone else''s profile'
);

select throws_ok(
  format($$ update public.profiles set created_at = now() - interval '1 year' where id = %L $$, :'alice'),
  '42501', null,
  'a user cannot edit protected profile columns'
);

select throws_ok(
  format($$ insert into public.user_roles (user_id, role) values (%L, 'admin') $$, :'alice'),
  '42501', null,
  'a user cannot grant themselves a role'
);

select throws_ok(
  format($$ select public.admin_set_role(%L, 'host', true) $$, :'alice'),
  '42501', 'Only admins can change roles',
  'a non-admin cannot call admin_set_role'
);

select is_empty($$ select id from public.audit_logs $$, 'a non-admin cannot read audit logs');

select lives_ok(
  $$ insert into public.legal_acceptances (document, version) values ('terms', '2026-11') $$,
  'a user can record accepting the terms'
);

select throws_ok(
  format($$ insert into public.legal_acceptances (user_id, document, version) values (%L, 'terms', '2026-11') $$, :'bob'),
  '42501', null,
  'a user cannot record an acceptance for someone else'
);

reset role;

-- --- Admin ---------------------------------------------------------------------
select tests.authenticate_as(:'carol');

select ok(
  (select count(*) from public.profiles) >= 4,
  'an admin can read all profiles'
);

select lives_ok(
  format($$ select public.admin_set_role(%L, 'host', true) $$, :'alice'),
  'an admin can grant a role'
);

select results_eq(
  format($$ select action, target_id from public.audit_logs where target_id = %L $$, :'alice'),
  format($$ values ('role.granted'::text, %L::text) $$, :'alice'),
  'granting a role is written to the audit log'
);

select throws_ok(
  format($$ select public.admin_set_role(%L, 'admin', false) $$, :'carol'),
  '22023', 'Admins cannot remove their own admin role',
  'an admin cannot lock themselves out'
);

select throws_ok(
  format($$ select public.admin_set_role(%L, 'customer', false) $$, :'alice'),
  '22023', 'The customer role cannot be removed',
  'the base customer role is permanent'
);

reset role;

-- --- Append-only, even for the database owner ---------------------------------
select throws_ok(
  $$ delete from public.audit_logs $$,
  'P0001', null,
  'audit logs cannot be deleted, even by the table owner'
);

select * from finish();
rollback;
