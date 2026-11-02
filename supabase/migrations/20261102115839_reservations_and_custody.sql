-- =============================================================================
-- Reservations, parcels, pickup tokens and the custody log.
--
-- Clients get READ access only. Every state change will go through a
-- SECURITY DEFINER RPC (later phases) that validates the transition and
-- writes exactly one custody event in the same transaction.
-- =============================================================================

-- "VZ-" + 6 characters from a 32-symbol alphabet without the look-alikes
-- 0/O and 1/I. 32 divides 256 evenly, so `byte % 32` has no modulo bias.
-- 32^6 ≈ 1.07 billion combinations; collisions are caught by the unique index.
create function private.generate_reference_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := 'VZ-';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- -----------------------------------------------------------------------------
create table public.reservations (
  id                            uuid primary key default gen_random_uuid(),
  reference_code                text not null unique default private.generate_reference_code()
                                  check (reference_code ~ '^VZ-[A-HJ-NP-Z2-9]{6}$'),
  customer_id                   uuid not null references public.profiles (id) on delete restrict,
  host_id                       uuid not null references public.host_profiles (id) on delete restrict,
  status                        public.reservation_status not null default 'requested',
  expected_delivery_date        date not null,
  -- Optional, customer-provided. Never fetched from carriers (no integrations).
  merchant_name                 text check (char_length(merchant_name) <= 100),
  carrier_name                  text check (char_length(carrier_name) <= 60),
  tracking_number               text check (char_length(tracking_number) <= 100),
  declared_size                 public.parcel_size not null,
  declared_value_cents          integer not null check (declared_value_cents >= 0),
  customer_note                 text check (char_length(customer_note) <= 500),
  decline_reason                text check (char_length(decline_reason) <= 500),
  cancel_reason                 text check (char_length(cancel_reason) <= 500),
  prohibited_items_attested_at  timestamptz not null,
  responded_at                  timestamptz,
  expires_at                    timestamptz,
  cancelled_at                  timestamptz,
  completed_at                  timestamptz,
  has_open_incident             boolean not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index reservations_customer_idx on public.reservations (customer_id, created_at desc);
create index reservations_host_status_idx on public.reservations (host_id, status);
create index reservations_active_expiry_idx on public.reservations (expires_at)
  where status in ('requested', 'accepted', 'awaiting_pickup');

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- A reservation can hold several parcels (split shipments).
create table public.parcels (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid not null references public.reservations (id) on delete restrict,
  status          public.parcel_status not null default 'received',
  size            public.parcel_size not null,
  -- Storage path of the exterior photo (private bucket, short retention).
  photo_path      text check (char_length(photo_path) <= 300),
  received_at     timestamptz not null default now(),
  received_by     uuid references public.profiles (id) on delete set null,
  collected_at    timestamptz,
  handed_over_by  uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index parcels_reservation_idx on public.parcels (reservation_id);

create trigger parcels_set_updated_at
  before update on public.parcels
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Pickup codes. Only hashes are stored; the plaintext QR token and PIN are
-- returned once by the issuing RPC. No client can read this table at all.
create table public.pickup_tokens (
  id               uuid primary key default gen_random_uuid(),
  reservation_id   uuid not null references public.reservations (id) on delete cascade,
  token_hash       bytea not null,
  pin_hash         bytea not null,
  expires_at       timestamptz not null,
  used_at          timestamptz,
  revoked_at       timestamptz,
  failed_attempts  smallint not null default 0 check (failed_attempts between 0 and 10),
  created_at       timestamptz not null default now()
);

-- At most one live code per reservation.
create unique index pickup_tokens_one_active_idx on public.pickup_tokens (reservation_id)
  where used_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- custody_events: append-only chain of custody. The evidence for disputes.
create table public.custody_events (
  id              bigint generated always as identity primary key,
  reservation_id  uuid not null references public.reservations (id) on delete restrict,
  parcel_id       uuid references public.parcels (id) on delete restrict,
  event_type      public.custody_event_type not null,
  actor_id        uuid,  -- no FK: history must survive account pseudonymization
  actor_role      public.actor_role not null,
  occurred_at     timestamptz not null default now(),
  metadata        jsonb not null default '{}'::jsonb
);

create index custody_events_reservation_idx on public.custody_events (reservation_id, occurred_at);

create trigger custody_events_append_only
  before update or delete on public.custody_events
  for each row execute function private.prevent_mutation();

create trigger custody_events_no_truncate
  before truncate on public.custody_events
  for each statement execute function private.prevent_mutation();

-- =============================================================================
-- Helpers
-- =============================================================================

-- Is the current user the customer or the host of this reservation?
create function private.is_reservation_party(p_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reservations r
    join public.host_profiles h on h.id = r.host_id
    where r.id = p_reservation_id
      and (r.customer_id = (select auth.uid()) or h.user_id = (select auth.uid()))
  );
$$;

-- Has the current user booked this host (so they can still see it if it's
-- later paused or suspended)?
create function private.has_booked_host(p_host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reservations
    where host_id = p_host_id and customer_id = (select auth.uid())
  );
$$;

grant execute on function private.is_reservation_party(uuid) to authenticated, service_role;
grant execute on function private.has_booked_host(uuid) to authenticated, service_role;

-- Appends a custody event, deriving the actor's role from the reservation.
-- Called only by SECURITY DEFINER RPCs and scheduled jobs (no auth.uid() => system).
create function private.record_custody_event(
  p_reservation_id uuid,
  p_event_type public.custody_event_type,
  p_parcel_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.actor_role;
  v_id bigint;
begin
  select case
           when v_uid is null then 'system'
           when r.customer_id = v_uid then 'customer'
           when h.user_id = v_uid then 'host'
           when private.has_role('admin') then 'admin'
         end::public.actor_role
    into v_role
  from public.reservations r
  join public.host_profiles h on h.id = r.host_id
  where r.id = p_reservation_id;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id using errcode = 'P0002';
  end if;

  if v_role is null then
    raise exception 'Not a party to this reservation' using errcode = '42501';
  end if;

  insert into public.custody_events (reservation_id, parcel_id, event_type, actor_id, actor_role, metadata)
  values (p_reservation_id, p_parcel_id, p_event_type, v_uid, v_role, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

-- =============================================================================
-- Row Level Security (read-only for clients)
-- =============================================================================
alter table public.reservations enable row level security;
alter table public.parcels enable row level security;
alter table public.pickup_tokens enable row level security;
alter table public.custody_events enable row level security;

grant select on public.reservations, public.parcels, public.custody_events to authenticated;
-- pickup_tokens: no grants and no policies => invisible to every client role.

create policy "reservations: parties and admins read"
  on public.reservations for select to authenticated
  using (
    customer_id = (select auth.uid())
    or (select private.owns_host(host_id))
    or (select private.has_role('admin'))
  );

create policy "parcels: parties and admins read"
  on public.parcels for select to authenticated
  using ((select private.is_reservation_party(reservation_id)) or (select private.has_role('admin')));

create policy "custody_events: parties and admins read"
  on public.custody_events for select to authenticated
  using ((select private.is_reservation_party(reservation_id)) or (select private.has_role('admin')));

-- Customers keep seeing hosts they booked, even if the host is later paused or suspended.
create policy "host_profiles: customers read hosts they booked"
  on public.host_profiles for select to authenticated
  using ((select private.has_booked_host(id)));
