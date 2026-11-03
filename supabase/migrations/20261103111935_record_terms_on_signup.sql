-- =============================================================================
-- Record terms + privacy acceptance at sign-up.
--
-- The sign-up form sends `terms_version` in user metadata. There is no session
-- until the email is confirmed, so the client cannot insert into
-- legal_acceptances itself; the sign-up trigger records it instead.
-- (Replaces the function from 20261102115836_identity_and_roles.sql.)
-- =============================================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms_version text := nullif(left(trim(new.raw_user_meta_data ->> 'terms_version'), 20), '');
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

  if v_terms_version is not null then
    insert into public.legal_acceptances (user_id, document, version)
    values (new.id, 'terms', v_terms_version),
           (new.id, 'privacy', v_terms_version);
  end if;

  return new;
end;
$$;
