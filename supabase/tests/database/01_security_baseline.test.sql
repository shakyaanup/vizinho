-- Schema-wide security guarantees. These fail the build if a future migration
-- forgets RLS, leaks a grant, or ships an unsafe SECURITY DEFINER function.
begin;
\ir _helpers.psql

select plan(10);

select tables_are(
  'public',
  array[
    'profiles', 'user_roles', 'audit_logs', 'legal_acceptances',
    'host_profiles', 'host_private_details', 'host_weekly_hours', 'host_time_off',
    'reservations', 'parcels', 'pickup_tokens', 'custody_events',
    'incidents', 'incident_attachments', 'ledger_entries', 'notifications', 'privacy_requests'
  ],
  'public schema contains exactly the expected tables'
);

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every public table has row level security enabled'
);

select is_empty(
  $$ select table_name, privilege_type
       from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public' $$,
  'anon (signed-out visitors) has no table privileges at all'
);

select is_empty(
  $$ select table_name, privilege_type
       from information_schema.role_table_grants
      where grantee = 'authenticated' and table_schema = 'public'
        and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
        and table_name not in ('host_weekly_hours', 'host_time_off') $$,
  'clients can delete only their own schedule rows, nothing else'
);

select is_empty(
  $$ select table_name, column_name, privilege_type
       from information_schema.column_privileges
      where grantee = 'authenticated' and table_schema = 'public'
        and table_name in ('reservations', 'parcels', 'custody_events', 'audit_logs',
                           'ledger_entries', 'incidents', 'incident_attachments', 'user_roles')
        and privilege_type <> 'SELECT' $$,
  'state tables are read-only for clients (writes only through RPCs)'
);

select is_empty(
  $$ select privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'pickup_tokens'
        and grantee in ('anon', 'authenticated') $$,
  'pickup_tokens is invisible to every client role'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and p.prosecdef
        and not exists (
          select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
        ) $$,
  'every SECURITY DEFINER function pins its search_path'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and has_function_privilege('anon', p.oid, 'execute') $$,
  'signed-out visitors cannot execute any of our functions'
);

select ok(
  not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'clients cannot invoke the access-token hook'
);

select ok(
  not has_function_privilege('authenticated', 'private.record_custody_event(uuid, public.custody_event_type, uuid, jsonb)', 'execute'),
  'clients cannot forge custody events'
);

select * from finish();
rollback;
