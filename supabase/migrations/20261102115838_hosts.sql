-- =============================================================================
-- Hosts: public profile, private address, weekly hours, time off.
--
-- Privacy model: the exact address and coordinates live ONLY in
-- host_private_details (owner + admin). host_profiles.public_location is a
-- grid-snapped copy maintained by a trigger, so clients can never set or
-- derive the exact point from it.
-- =============================================================================

create table public.host_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null default auth.uid() unique
                              references public.profiles (id) on delete restrict,
  host_type                 public.host_type not null default 'individual',
  status                    public.host_status not null default 'draft',
  display_name              text not null check (char_length(display_name) between 2 and 60),
  business_name             text check (char_length(business_name) between 2 and 120),
  area_label                text check (char_length(area_label) <= 80),        -- e.g. "Arroios, Lisboa"
  public_location           extensions.geography(point, 4326),               -- snapped, never exact
  rules_text                text check (char_length(rules_text) <= 1000),
  max_parcel_size           public.parcel_size not null default 'medium',
  max_declared_value_cents  integer not null default 20000
                              check (max_declared_value_cents between 0 and 100000),
  max_concurrent_parcels    integer not null default 5
                              check (max_concurrent_parcels between 1 and 50),
  is_paused                 boolean not null default false,
  review_note               text check (char_length(review_note) <= 1000),   -- admin feedback
  reviewed_by               uuid references public.profiles (id) on delete set null,
  reviewed_at               timestamptz,
  terms_version             text,
  terms_accepted_at         timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint business_hosts_have_business_name
    check (host_type <> 'business' or business_name is not null)
);

create index host_profiles_status_idx on public.host_profiles (status);
create index host_profiles_public_location_idx on public.host_profiles using gist (public_location);

create trigger host_profiles_set_updated_at
  before update on public.host_profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
create table public.host_private_details (
  host_id              uuid primary key references public.host_profiles (id) on delete cascade,
  address_line1        text not null check (char_length(address_line1) between 3 and 120),
  address_line2        text check (char_length(address_line2) <= 120),
  postal_code          text not null check (postal_code ~ '^[0-9]{4}-[0-9]{3}$'), -- Portuguese format
  city                 text not null check (char_length(city) between 2 and 80),
  exact_location       extensions.geography(point, 4326) not null,
  access_instructions  text check (char_length(access_instructions) <= 500),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger host_private_details_set_updated_at
  before update on public.host_private_details
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 1 = Monday … 7 = Sunday (ISO). Times are Europe/Lisbon local time.
create table public.host_weekly_hours (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null references public.host_profiles (id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 7),
  opens_at   time not null,
  closes_at  time not null,
  created_at timestamptz not null default now(),
  constraint closes_after_opens check (closes_at > opens_at),
  unique (host_id, weekday, opens_at)
);

create index host_weekly_hours_host_idx on public.host_weekly_hours (host_id);

create table public.host_time_off (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references public.host_profiles (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text check (char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  constraint ends_after_starts check (ends_at > starts_at)
);

create index host_time_off_host_idx on public.host_time_off (host_id, starts_at);

-- =============================================================================
-- Helpers
-- =============================================================================

-- Does the current user own this host profile?
create function private.owns_host(p_host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.host_profiles
    where id = p_host_id and user_id = (select auth.uid())
  );
$$;

-- Is this host publicly listed?
create function private.is_host_approved(p_host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.host_profiles
    where id = p_host_id and status = 'approved'
  );
$$;

grant execute on function private.owns_host(uuid) to authenticated, service_role;
grant execute on function private.is_host_approved(uuid) to authenticated, service_role;

-- Snap a point to a fixed grid (~445 m N-S x ~435 m E-W at Lisbon's latitude).
-- Deterministic on purpose: random jitter could be averaged away by repeated
-- requests, while a fixed cell centre reveals nothing more than "in this cell".
create function private.snap_to_grid(location extensions.geography)
returns extensions.geography
language sql
immutable
set search_path = ''
as $$
  select extensions.st_setsrid(
    extensions.st_makepoint(
      round(extensions.st_x(location::extensions.geometry) / 0.005) * 0.005,
      round(extensions.st_y(location::extensions.geometry) / 0.004) * 0.004
    ),
    4326
  )::extensions.geography;
$$;

-- Whenever the exact location changes, refresh the public snapped location.
create function private.sync_public_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.host_profiles
     set public_location = private.snap_to_grid(new.exact_location)
   where id = new.host_id;
  return new;
end;
$$;

create trigger host_private_details_sync_public_location
  after insert or update of exact_location on public.host_private_details
  for each row execute function private.sync_public_location();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.host_profiles enable row level security;
alter table public.host_private_details enable row level security;
alter table public.host_weekly_hours enable row level security;
alter table public.host_time_off enable row level security;

-- host_profiles ------------------------------------------------------------------
grant select on public.host_profiles to authenticated;
-- Hosts edit their own listing; status, review fields and public_location are
-- deliberately NOT grantable (admin RPCs and the trigger own those).
grant insert (
  host_type, display_name, business_name, area_label, rules_text,
  max_parcel_size, max_declared_value_cents, max_concurrent_parcels
) on public.host_profiles to authenticated;
grant update (
  host_type, display_name, business_name, area_label, rules_text,
  max_parcel_size, max_declared_value_cents, max_concurrent_parcels, is_paused
) on public.host_profiles to authenticated;

create policy "host_profiles: approved hosts are listed"
  on public.host_profiles for select to authenticated
  using (status = 'approved');

create policy "host_profiles: owners and admins read"
  on public.host_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

create policy "host_profiles: create own application"
  on public.host_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "host_profiles: owners update"
  on public.host_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- host_private_details -----------------------------------------------------------
grant select, insert, update on public.host_private_details to authenticated;

create policy "host_private_details: owners and admins read"
  on public.host_private_details for select to authenticated
  using ((select private.owns_host(host_id)) or (select private.has_role('admin')));

create policy "host_private_details: owners insert"
  on public.host_private_details for insert to authenticated
  with check ((select private.owns_host(host_id)));

create policy "host_private_details: owners update"
  on public.host_private_details for update to authenticated
  using ((select private.owns_host(host_id)))
  with check ((select private.owns_host(host_id)));

-- host_weekly_hours ----------------------------------------------------------------
grant select, insert, update, delete on public.host_weekly_hours to authenticated;

create policy "host_weekly_hours: visible for approved hosts, owners and admins"
  on public.host_weekly_hours for select to authenticated
  using (
    (select private.is_host_approved(host_id))
    or (select private.owns_host(host_id))
    or (select private.has_role('admin'))
  );

create policy "host_weekly_hours: owners insert"
  on public.host_weekly_hours for insert to authenticated
  with check ((select private.owns_host(host_id)));

create policy "host_weekly_hours: owners update"
  on public.host_weekly_hours for update to authenticated
  using ((select private.owns_host(host_id)))
  with check ((select private.owns_host(host_id)));

create policy "host_weekly_hours: owners delete"
  on public.host_weekly_hours for delete to authenticated
  using ((select private.owns_host(host_id)));

-- host_time_off (private: customers only ever see computed availability) ---------
grant select, insert, update, delete on public.host_time_off to authenticated;

create policy "host_time_off: owners and admins read"
  on public.host_time_off for select to authenticated
  using ((select private.owns_host(host_id)) or (select private.has_role('admin')));

create policy "host_time_off: owners insert"
  on public.host_time_off for insert to authenticated
  with check ((select private.owns_host(host_id)));

create policy "host_time_off: owners update"
  on public.host_time_off for update to authenticated
  using ((select private.owns_host(host_id)))
  with check ((select private.owns_host(host_id)));

create policy "host_time_off: owners delete"
  on public.host_time_off for delete to authenticated
  using ((select private.owns_host(host_id)));
