-- =============================================================================
-- Foundation: extensions, private schema, deny-by-default privileges, enums and
-- shared trigger functions used by every later migration.
-- =============================================================================

-- PostGIS for host locations and distance search; pgcrypto for random bytes and
-- hashing. Supabase keeps extensions in their own schema.
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- `private` schema: helper functions used by RLS policies and RPCs. It is NOT
-- exposed through the Supabase Data API, so clients cannot call these directly.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
-- RLS policies run as the requesting role, so it needs USAGE to call helpers.
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Deny by default. Supabase normally auto-grants full table access to `anon`
-- and `authenticated`, leaving RLS as the only guard. We remove those defaults
-- so every table must explicitly grant exactly what clients may do.
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
-- Postgres lets EVERY role (PUBLIC) execute new functions by default. That is a
-- global default, and per-schema defaults can only add to globals, never remove,
-- so this revoke must be global. Functions created by later migrations are
-- therefore private until explicitly granted. (Extensions above were created
-- before this line, so their functions stay callable.)
alter default privileges revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'host', 'admin');

create type public.actor_role as enum ('customer', 'host', 'admin', 'system');

create type public.host_type as enum ('individual', 'business');

create type public.host_status as enum (
  'draft',           -- application being filled in
  'pending_review',  -- submitted, waiting for an admin
  'approved',        -- visible to customers
  'rejected',
  'suspended'
);

create type public.parcel_size as enum ('small', 'medium', 'large');

create type public.reservation_status as enum (
  'requested',        -- customer asked, host has not answered
  'accepted',         -- host accepted, address revealed, waiting for parcel
  'declined',
  'cancelled',
  'expired',
  'awaiting_pickup',  -- at least one parcel checked in
  'collected',
  'unclaimed',        -- storage period ran out
  'closed'            -- admin closed after unclaimed/dispute
);

create type public.parcel_status as enum (
  'received', 'collected', 'unclaimed', 'returned', 'lost', 'damaged'
);

create type public.custody_event_type as enum (
  'reservation_requested',
  'reservation_accepted',
  'reservation_declined',
  'reservation_cancelled',
  'reservation_expired',
  'address_viewed',
  'parcel_checked_in',
  'parcel_refused',
  'pickup_code_issued',
  'pickup_code_failed',
  'parcel_handed_over',
  'parcel_unclaimed',
  'incident_opened',
  'incident_resolved',
  'admin_override'
);

create type public.incident_type as enum (
  'unknown_parcel', 'damaged', 'missing', 'wrong_parcel',
  'failed_delivery', 'no_show', 'safety', 'other'
);

create type public.incident_status as enum ('open', 'investigating', 'resolved', 'dismissed');

create type public.ledger_entry_type as enum ('earning', 'adjustment', 'payout');

create type public.privacy_request_type as enum ('export', 'deletion');

create type public.privacy_request_status as enum ('pending', 'in_progress', 'completed', 'rejected');

create type public.legal_document as enum ('terms', 'privacy', 'host_agreement');

-- -----------------------------------------------------------------------------
-- Shared triggers
-- -----------------------------------------------------------------------------

-- Keeps `updated_at` correct no matter who writes the row.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attached to append-only tables (custody_events, audit_logs, ledger_entries).
-- Fires for EVERY role, including the service role and table owner, so history
-- cannot be rewritten even by a compromised server key.
create function private.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, lower(tg_op)
    using errcode = 'P0001',
          hint = 'Record a new correcting row instead.';
end;
$$;
