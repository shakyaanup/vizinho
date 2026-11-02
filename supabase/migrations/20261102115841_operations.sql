-- =============================================================================
-- Operations: incidents, payout ledger, in-app notifications, privacy requests.
-- =============================================================================

create table public.incidents (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid references public.reservations (id) on delete restrict,
  parcel_id       uuid references public.parcels (id) on delete restrict,
  -- For incidents not tied to a reservation (e.g. an unknown parcel at a host).
  host_id         uuid references public.host_profiles (id) on delete restrict,
  reported_by     uuid not null references public.profiles (id) on delete restrict,
  type            public.incident_type not null,
  status          public.incident_status not null default 'open',
  description     text not null check (char_length(description) between 10 and 2000),
  resolution      text check (char_length(resolution) <= 2000),
  assigned_to     uuid references public.profiles (id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint incident_has_subject check (reservation_id is not null or host_id is not null)
);

create index incidents_status_idx on public.incidents (status, created_at desc);
create index incidents_reservation_idx on public.incidents (reservation_id);
create index incidents_host_idx on public.incidents (host_id);

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function private.set_updated_at();

create table public.incident_attachments (
  id            uuid primary key default gen_random_uuid(),
  incident_id   uuid not null references public.incidents (id) on delete cascade,
  storage_path  text not null check (char_length(storage_path) <= 300),
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index incident_attachments_incident_idx on public.incident_attachments (incident_id);

-- Can the current user see this incident? (reporter, reservation party, host owner)
create function private.can_view_incident(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.incidents i
    where i.id = p_incident_id
      and (
        i.reported_by = (select auth.uid())
        or (i.reservation_id is not null and private.is_reservation_party(i.reservation_id))
        or (i.host_id is not null and private.owns_host(i.host_id))
      )
  );
$$;

grant execute on function private.can_view_incident(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Manual payout ledger (no PSP in the MVP). Append-only: corrections are new
-- `adjustment` rows, so the balance is always sum(amount_cents).
create table public.ledger_entries (
  id              bigint generated always as identity primary key,
  host_id         uuid not null references public.host_profiles (id) on delete restrict,
  reservation_id  uuid references public.reservations (id) on delete restrict,
  entry_type      public.ledger_entry_type not null,
  amount_cents    integer not null check (amount_cents <> 0),  -- payouts are negative
  note            text check (char_length(note) <= 500),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint payout_is_negative check (entry_type <> 'payout' or amount_cents < 0),
  constraint earning_is_positive check (entry_type <> 'earning' or amount_cents > 0)
);

create index ledger_entries_host_idx on public.ledger_entries (host_id, created_at desc);

create trigger ledger_entries_append_only
  before update or delete on public.ledger_entries
  for each row execute function private.prevent_mutation();

create trigger ledger_entries_no_truncate
  before truncate on public.ledger_entries
  for each statement execute function private.prevent_mutation();

-- -----------------------------------------------------------------------------
-- In-app notifications, delivered live via Supabase Realtime (no email/SMS).
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (char_length(type) between 3 and 60),  -- e.g. "reservation.accepted"
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Realtime only pushes rows the subscriber can SELECT under RLS.
alter publication supabase_realtime add table public.notifications;

-- -----------------------------------------------------------------------------
-- GDPR export/deletion requests, handled by admins.
create table public.privacy_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type          public.privacy_request_type not null,
  status        public.privacy_request_status not null default 'pending',
  admin_note    text check (char_length(admin_note) <= 1000),
  handled_by    uuid references public.profiles (id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One open request of each type per user.
create unique index privacy_requests_one_open_idx on public.privacy_requests (user_id, type)
  where status in ('pending', 'in_progress');

create trigger privacy_requests_set_updated_at
  before update on public.privacy_requests
  for each row execute function private.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.incidents enable row level security;
alter table public.incident_attachments enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.privacy_requests enable row level security;

-- incidents (writes via RPC in Phase 5) -------------------------------------------
grant select on public.incidents, public.incident_attachments to authenticated;

create policy "incidents: involved users and admins read"
  on public.incidents for select to authenticated
  using ((select private.can_view_incident(id)) or (select private.has_role('admin')));

create policy "incident_attachments: same visibility as the incident"
  on public.incident_attachments for select to authenticated
  using ((select private.can_view_incident(incident_id)) or (select private.has_role('admin')));

-- ledger_entries (admins write via RPC) -------------------------------------------
grant select on public.ledger_entries to authenticated;

create policy "ledger_entries: host owners and admins read"
  on public.ledger_entries for select to authenticated
  using ((select private.owns_host(host_id)) or (select private.has_role('admin')));

-- notifications -----------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: mark own as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- privacy_requests ------------------------------------------------------------------
grant select on public.privacy_requests to authenticated;
grant insert (type) on public.privacy_requests to authenticated;

create policy "privacy_requests: read own, admins read all"
  on public.privacy_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

create policy "privacy_requests: create own"
  on public.privacy_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
