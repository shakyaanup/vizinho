-- =============================================================================
-- Identity: profiles, additive roles, audit log, legal acceptances.
-- A profile + `customer` role are created automatically for every new auth user.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: one row per auth user (public-facing account data)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 100),
  -- Collected but NOT verified (portfolio scope: no SMS).
  phone_e164  text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  locale      text not null default 'en' check (locale in ('en', 'pt-PT')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Set when a deletion request pseudonymizes the account.
  deleted_at  timestamptz
);

comment on table public.profiles is 'Account data for each auth user. Roles live in user_roles.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_roles: additive roles (a user can be customer AND host).
-- Never stored in auth user_metadata, which the user can edit themselves.
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  granted_by  uuid references public.profiles (id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

-- -----------------------------------------------------------------------------
-- has_role(): the authorization primitive used by RLS policies and RPCs.
-- SECURITY DEFINER so it can read user_roles regardless of the caller's RLS,
-- and it only ever answers about the *current* user.
-- -----------------------------------------------------------------------------
create function private.has_role(requested public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = requested
  );
$$;

grant execute on function private.has_role(public.app_role) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- audit_logs: append-only record of privileged (admin) actions.
-- actor_id has no FK so entries survive account pseudonymization.
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id            bigint generated always as identity primary key,
  actor_id      uuid,
  action        text not null check (char_length(action) between 3 and 100),
  target_table  text,
  target_id     text,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_table, target_id);

create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function private.prevent_mutation();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.prevent_mutation();

-- Internal helper for SECURITY DEFINER RPCs; not callable by clients.
create function private.write_audit_log(
  p_action text,
  p_target_table text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, target_table, target_id, details)
  values ((select auth.uid()), p_action, p_target_table, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

-- -----------------------------------------------------------------------------
-- legal_acceptances: which version of which document a user accepted, and when.
-- -----------------------------------------------------------------------------
create table public.legal_acceptances (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  document     public.legal_document not null,
  version      text not null check (char_length(version) between 1 and 20),
  accepted_at  timestamptz not null default now(),
  primary key (user_id, document, version)
);

-- -----------------------------------------------------------------------------
-- New auth user  ->  profile + `customer` role.
-- Only the display name and locale are read from user_metadata (user-controlled
-- input), and both are sanitized. Roles are never taken from metadata.
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Vizinho user'
      ),
      100
    ),
    case when new.raw_user_meta_data ->> 'locale' = 'pt-PT' then 'pt-PT' else 'en' end
  );

  insert into public.user_roles (user_id, role) values (new.id, 'customer');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Custom Access Token Hook: copies the user's roles into every JWT as
-- `app_roles`, so the Next.js proxy can route without a DB round-trip.
-- JWT claims can be up to `jwt_expiry` stale, so sensitive checks always
-- re-query via has_role().
-- -----------------------------------------------------------------------------
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  roles jsonb;
  claims jsonb;
begin
  select coalesce(jsonb_agg(ur.role order by ur.role), '[]'::jsonb)
    into roles
  from public.user_roles ur
  where ur.user_id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_roles}', roles);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Only Supabase Auth may run the hook.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on table public.user_roles to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- RPC: admin grants or revokes a role. Audited.
-- -----------------------------------------------------------------------------
create function public.admin_set_role(
  target_user uuid,
  target_role public.app_role,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;

  if target_role = 'customer' and not enabled then
    raise exception 'The customer role cannot be removed' using errcode = '22023';
  end if;

  if target_role = 'admin' and not enabled and target_user = (select auth.uid()) then
    raise exception 'Admins cannot remove their own admin role' using errcode = '22023';
  end if;

  if enabled then
    insert into public.user_roles (user_id, role, granted_by)
    values (target_user, target_role, (select auth.uid()))
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles
    where user_id = target_user and role = target_role;
  end if;

  perform private.write_audit_log(
    case when enabled then 'role.granted' else 'role.revoked' end,
    'user_roles',
    target_user::text,
    jsonb_build_object('role', target_role)
  );
end;
$$;

grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.legal_acceptances enable row level security;

-- profiles ----------------------------------------------------------------------
grant select on public.profiles to authenticated;
-- Column-level grant: users may edit only these fields (never id or timestamps).
grant update (full_name, phone_e164, locale) on public.profiles to authenticated;

create policy "profiles: read own, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_role('admin')));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_roles -------------------------------------------------------------------
grant select on public.user_roles to authenticated;

create policy "user_roles: read own, admins read all"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

create policy "user_roles: auth hook reads all"
  on public.user_roles for select to supabase_auth_admin
  using (true);

-- audit_logs -------------------------------------------------------------------
grant select on public.audit_logs to authenticated;

create policy "audit_logs: admins read"
  on public.audit_logs for select to authenticated
  using ((select private.has_role('admin')));

-- legal_acceptances ------------------------------------------------------------
grant select on public.legal_acceptances to authenticated;
grant insert (document, version) on public.legal_acceptances to authenticated;

create policy "legal_acceptances: read own, admins read all"
  on public.legal_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

create policy "legal_acceptances: insert own"
  on public.legal_acceptances for insert to authenticated
  with check (user_id = (select auth.uid()));
