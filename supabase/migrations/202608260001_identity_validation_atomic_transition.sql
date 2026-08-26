-- La transition d’identité est atomique : elle associe la décision du dossier,
-- le statut du profil, le selfie validé et la notification dans une seule opération.
-- Cette migration est uniquement préparée localement et ne doit être appliquée
-- en production qu’après validation explicite.

create or replace function public.am_prevent_profile_escalation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare identity_transition boolean := current_setting('am.identity_transition', true) = 'true' and coalesce(auth.role(), '') = 'service_role';
begin
  if old.role is distinct from new.role and not am_private.am_is_admin() then raise exception 'Role modification forbidden'; end if;
  if old.verification_status is distinct from new.verification_status and not am_private.am_is_admin() and not identity_transition then raise exception 'Verification modification forbidden'; end if;
  if old.profile_photo_path is distinct from new.profile_photo_path and not am_private.am_is_admin() and not identity_transition then raise exception 'Profile photo is controlled by verification'; end if;
  return new;
end;
$$;

create or replace function public.am_apply_identity_decision(
  p_verification_id uuid,
  p_decision text,
  p_review jsonb,
  p_note text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare v public.am_identity_verifications%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Identity decision service only'; end if;
  if p_decision not in ('pending', 'approved', 'rejected') then raise exception 'Invalid identity decision'; end if;

  select * into v from public.am_identity_verifications
  where id = p_verification_id and status = 'pending'
  for update;
  if not found then raise exception 'Verification not pending'; end if;

  perform set_config('am.identity_transition', 'true', true);
  update public.am_identity_verifications
  set status = p_decision,
      ai_review = p_review,
      ai_reviewed_at = now(),
      admin_note = case when p_decision = 'rejected' then p_note else null end
  where id = v.id;

  if p_decision = 'approved' then
    update public.am_profiles
    set verification_status = 'verified', profile_photo_path = v.selfie_path
    where id = v.user_id;
    insert into public.am_notifications (user_id, type, title, body)
    values (v.user_id, 'verification', 'Profil vérifié', 'Votre badge vérifié est désormais actif.');
  elsif p_decision = 'rejected' then
    update public.am_profiles set verification_status = 'rejected' where id = v.user_id;
    insert into public.am_notifications (user_id, type, title, body)
    values (v.user_id, 'verification', 'Nouvelle soumission requise', coalesce(p_note, 'Votre dossier doit être soumis à nouveau avec des preuves plus lisibles.'));
  else
    update public.am_profiles set verification_status = 'pending' where id = v.user_id and verification_status <> 'verified';
  end if;

  return p_decision;
end;
$$;

revoke all on function public.am_apply_identity_decision(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.am_apply_identity_decision(uuid, text, jsonb, text) to service_role;
