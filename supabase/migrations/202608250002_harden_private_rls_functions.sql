-- Déplace les helpers SECURITY DEFINER de RLS hors du schéma API exposé.
create schema if not exists am_private;

create or replace function am_private.am_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.am_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function am_private.am_is_verified(uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.am_profiles where id = $1 and verification_status = 'verified');
$$;

create or replace function public.am_prevent_profile_escalation() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role is distinct from new.role and not am_private.am_is_admin() then raise exception 'Role modification forbidden'; end if;
  if old.verification_status is distinct from new.verification_status and not am_private.am_is_admin() then raise exception 'Verification modification forbidden'; end if;
  if old.profile_photo_path is distinct from new.profile_photo_path and not am_private.am_is_admin() then raise exception 'Profile photo is controlled by verification'; end if;
  return new;
end;
$$;

drop policy if exists "am_profile_self_or_admin_read" on public.am_profiles;
drop policy if exists "am_profile_self_update" on public.am_profiles;
drop policy if exists "am_categories_admin_inactive_read" on public.am_categories;
drop policy if exists "am_categories_admin_write" on public.am_categories;
drop policy if exists "am_listings_owner_or_admin_read" on public.am_listings;
drop policy if exists "am_listings_verified_owner_create" on public.am_listings;
drop policy if exists "am_listings_owner_or_admin_update" on public.am_listings;
drop policy if exists "am_listings_owner_or_admin_delete" on public.am_listings;
drop policy if exists "am_conversations_members_read" on public.am_conversations;
drop policy if exists "am_conversations_buyer_create" on public.am_conversations;
drop policy if exists "am_messages_members_read" on public.am_messages;
drop policy if exists "am_follows_self_read" on public.am_seller_follows;
drop policy if exists "am_follows_verified_create" on public.am_seller_follows;
drop policy if exists "am_follows_self_delete" on public.am_seller_follows;
drop policy if exists "am_notifications_self_read" on public.am_notifications;
drop policy if exists "am_verifications_self_read" on public.am_identity_verifications;

create policy "am_profile_self_or_admin_read" on public.am_profiles for select to authenticated using (id = auth.uid() or am_private.am_is_admin());
create policy "am_profile_self_update" on public.am_profiles for update to authenticated using (id = auth.uid() or am_private.am_is_admin()) with check (id = auth.uid() or am_private.am_is_admin());
create policy "am_categories_admin_inactive_read" on public.am_categories for select to authenticated using (am_private.am_is_admin());
create policy "am_categories_admin_write" on public.am_categories for all to authenticated using (am_private.am_is_admin()) with check (am_private.am_is_admin());
create policy "am_listings_owner_or_admin_read" on public.am_listings for select to authenticated using (owner_id = auth.uid() or am_private.am_is_admin());
create policy "am_listings_verified_owner_create" on public.am_listings for insert to authenticated with check (owner_id = auth.uid() and am_private.am_is_verified(auth.uid()));
create policy "am_listings_owner_or_admin_update" on public.am_listings for update to authenticated using (owner_id = auth.uid() or am_private.am_is_admin()) with check (owner_id = auth.uid() or am_private.am_is_admin());
create policy "am_listings_owner_or_admin_delete" on public.am_listings for delete to authenticated using (owner_id = auth.uid() or am_private.am_is_admin());
create policy "am_conversations_members_read" on public.am_conversations for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid() or am_private.am_is_admin());
create policy "am_conversations_buyer_create" on public.am_conversations for insert to authenticated with check (buyer_id = auth.uid() and seller_id <> auth.uid() and am_private.am_is_verified(seller_id) and exists (select 1 from public.am_listings l where l.id = listing_id and l.owner_id = seller_id and l.status = 'published'));
create policy "am_messages_members_read" on public.am_messages for select to authenticated using (exists (select 1 from public.am_conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())) or am_private.am_is_admin());
create policy "am_follows_self_read" on public.am_seller_follows for select to authenticated using (follower_id = auth.uid() or am_private.am_is_admin());
create policy "am_follows_verified_create" on public.am_seller_follows for insert to authenticated with check (follower_id = auth.uid() and seller_id <> auth.uid() and am_private.am_is_verified(seller_id));
create policy "am_follows_self_delete" on public.am_seller_follows for delete to authenticated using (follower_id = auth.uid() or am_private.am_is_admin());
create policy "am_notifications_self_read" on public.am_notifications for select to authenticated using (user_id = auth.uid() or am_private.am_is_admin());
create policy "am_verifications_self_read" on public.am_identity_verifications for select to authenticated using (user_id = auth.uid() or am_private.am_is_admin());

revoke all on function public.am_is_admin() from public, anon, authenticated;
revoke all on function public.am_is_verified(uuid) from public, anon, authenticated;
revoke all on schema am_private from public;
grant usage on schema am_private to authenticated;
grant execute on all functions in schema am_private to authenticated;
