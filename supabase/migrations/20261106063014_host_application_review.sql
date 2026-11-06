-- Host application lifecycle: an applicant submits, an admin decides.
--
--   draft ──submit──▶ pending_review ──approve──▶ approved ◀──reinstate── suspended
--   rejected ─submit─▶       │                       └────────suspend────────▶
--                            └──reject──▶ rejected
--
-- Clients cannot write host_profiles.status (no column grant), so these two
-- RPCs are the only way to move a listing between states. Each one writes an
-- audit_logs row and notifies the other side, in the same transaction.

create type public.host_review_decision as enum ('approve', 'reject', 'suspend', 'reinstate');

-- -----------------------------------------------------------------------------
-- Applicant: submit (or resubmit after a rejection) for review.
-- Returns the host profile id.
-- -----------------------------------------------------------------------------
create function public.submit_host_application(p_agreement_version text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host public.host_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if p_agreement_version is null or char_length(p_agreement_version) not between 1 and 20 then
    raise exception 'Invalid host agreement version' using errcode = '22023';
  end if;

  select * into v_host from public.host_profiles where user_id = v_uid for update;

  if not found then
    raise exception 'No host application to submit' using errcode = 'P0002';
  end if;

  if v_host.status not in ('draft', 'rejected') then
    raise exception 'Application is % and cannot be submitted', v_host.status
      using errcode = '55000';
  end if;

  -- Completeness: an admin should never review a half-filled application.
  if v_host.area_label is null then
    raise exception 'Application is missing the area' using errcode = '22023';
  end if;
  if not exists (select 1 from public.host_private_details d where d.host_id = v_host.id) then
    raise exception 'Application is missing the address' using errcode = '22023';
  end if;
  if not exists (select 1 from public.host_weekly_hours w where w.host_id = v_host.id) then
    raise exception 'Application is missing opening hours' using errcode = '22023';
  end if;

  insert into public.legal_acceptances (user_id, document, version)
  values (v_uid, 'host_agreement', p_agreement_version)
  on conflict do nothing;

  update public.host_profiles
     set status = 'pending_review',
         terms_version = p_agreement_version,
         terms_accepted_at = now()
   where id = v_host.id;

  perform private.write_audit_log(
    'host.application_submitted', 'host_profiles', v_host.id::text,
    jsonb_build_object('from', v_host.status, 'agreement_version', p_agreement_version)
  );

  insert into public.notifications (user_id, type, payload)
  select ur.user_id, 'host.application_submitted',
         jsonb_build_object('host_id', v_host.id, 'display_name', v_host.display_name)
    from public.user_roles ur
   where ur.role = 'admin';

  return v_host.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: approve, reject, suspend or reinstate a host. Returns the new status.
-- -----------------------------------------------------------------------------
create function public.admin_review_host(
  p_host_id uuid,
  p_decision public.host_review_decision,
  p_note text default null
)
returns public.host_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host public.host_profiles%rowtype;
  v_note text := nullif(trim(p_note), '');
  v_from public.host_status;
  v_to public.host_status;
begin
  -- Re-checked in the database: a stale JWT must not be enough.
  if not private.has_role('admin') then
    raise exception 'Only admins can review hosts' using errcode = '42501';
  end if;

  if char_length(v_note) > 1000 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;

  select * into v_host from public.host_profiles where id = p_host_id for update;

  if not found then
    raise exception 'Host not found' using errcode = 'P0002';
  end if;

  -- Four-eyes rule: an admin who is also a host cannot approve themselves.
  if v_host.user_id = v_uid then
    raise exception 'Admins cannot review their own listing' using errcode = '42501';
  end if;

  v_from := v_host.status;
  v_to := case
    when p_decision = 'approve'   and v_from = 'pending_review' then 'approved'
    when p_decision = 'reject'    and v_from = 'pending_review' then 'rejected'
    when p_decision = 'suspend'   and v_from = 'approved'       then 'suspended'
    when p_decision = 'reinstate' and v_from = 'suspended'      then 'approved'
  end::public.host_status;

  if v_to is null then
    raise exception 'Cannot % a host that is %', p_decision, v_from using errcode = '55000';
  end if;

  -- The applicant (or host) deserves a reason for a negative decision.
  if p_decision in ('reject', 'suspend') and v_note is null then
    raise exception 'A note is required to % a host', p_decision using errcode = '22023';
  end if;

  update public.host_profiles
     set status = v_to,
         review_note = v_note,
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = p_host_id;

  -- Approval makes the applicant a host. Suspension keeps the role: the host
  -- may still hold parcels that customers need to collect.
  if v_to = 'approved' then
    insert into public.user_roles (user_id, role, granted_by)
    values (v_host.user_id, 'host', v_uid)
    on conflict (user_id, role) do nothing;
  end if;

  perform private.write_audit_log(
    'host.' || case p_decision
      when 'approve' then 'approved' when 'reject' then 'rejected'
      when 'suspend' then 'suspended' else 'reinstated' end,
    'host_profiles', p_host_id::text,
    jsonb_build_object('from', v_from, 'to', v_to, 'note', v_note)
  );

  insert into public.notifications (user_id, type, payload)
  values (v_host.user_id, 'host.' || v_to::text,
          jsonb_build_object('host_id', p_host_id, 'note', v_note));

  return v_to;
end;
$$;

grant execute on function public.submit_host_application(text) to authenticated;
grant execute on function public.admin_review_host(uuid, public.host_review_decision, text) to authenticated;
