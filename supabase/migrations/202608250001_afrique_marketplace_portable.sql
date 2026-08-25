-- Afrique Marketplace — schéma portable Supabase/Postgres.
-- Les tables sont préfixées am_ afin de ne pas entrer en collision avec les
-- tables déjà présentes dans le projet Supabase "Afrique-business".

create extension if not exists pgcrypto;

create table if not exists public.am_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text unique,
  city text not null default '',
  bio text,
  business_category text,
  business_hours text,
  address text,
  website text,
  contact_email text,
  profile_photo_path text,
  cover_photo_path text,
  verification_status text not null default 'required' check (verification_status in ('required','pending','verified','rejected')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.am_categories (
  id text primary key,
  label text not null,
  sort_order smallint not null default 0,
  active boolean not null default true
);

create table if not exists public.am_public_seller_profiles (
  id uuid primary key references public.am_profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  city text not null,
  bio text,
  business_category text,
  business_hours text,
  address text,
  website text,
  contact_email text,
  profile_photo_path text,
  cover_photo_path text,
  updated_at timestamptz not null default now()
);

insert into public.am_categories (id, label, sort_order) values
  ('immobilier','Immobilier',10), ('vehicules','Véhicules',20), ('telephones','Téléphones',30),
  ('electronique','Électronique',40), ('mode','Mode',50), ('emploi','Emploi',60)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

create table if not exists public.am_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.am_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 140),
  description text not null check (char_length(description) >= 20),
  category_id text not null references public.am_categories(id),
  city text not null,
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'XOF' check (char_length(currency) = 3),
  item_condition text not null check (item_condition in ('neuf','comme_neuf','bon_etat','a_reparer')),
  media jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists am_listings_discovery_idx on public.am_listings(status, category_id, city, created_at desc);
create index if not exists am_listings_owner_idx on public.am_listings(owner_id, updated_at desc);

create table if not exists public.am_conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.am_profiles(id) on delete cascade,
  seller_id uuid not null references public.am_profiles(id) on delete cascade,
  listing_id uuid references public.am_listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint am_conversations_distinct_members check (buyer_id <> seller_id)
);
create unique index if not exists am_conversations_unique_listing on public.am_conversations(buyer_id, seller_id, listing_id) where listing_id is not null;
create index if not exists am_conversations_members_idx on public.am_conversations(buyer_id, seller_id, updated_at desc);

create table if not exists public.am_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.am_conversations(id) on delete cascade,
  sender_id uuid not null references public.am_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists am_messages_conversation_idx on public.am_messages(conversation_id, created_at);

create table if not exists public.am_reviews (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.am_profiles(id) on delete cascade,
  to_user_id uuid not null references public.am_profiles(id) on delete cascade,
  conversation_id uuid not null references public.am_conversations(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 8 and 1200),
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id, conversation_id)
);

create table if not exists public.am_seller_follows (
  follower_id uuid not null references public.am_profiles(id) on delete cascade,
  seller_id uuid not null references public.am_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, seller_id),
  constraint am_seller_follows_no_self check (follower_id <> seller_id)
);
create index if not exists am_seller_follows_seller_idx on public.am_seller_follows(seller_id, created_at desc);

create table if not exists public.am_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.am_profiles(id) on delete cascade,
  type text not null check (type in ('message','verification','review','system')),
  title text not null check (char_length(title) <= 160),
  body text not null,
  link_path text check (link_path is null or link_path like '/annonce/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists am_notifications_user_idx on public.am_notifications(user_id, created_at desc);

create table if not exists public.am_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.am_profiles(id) on delete cascade,
  document_type text not null check (document_type in ('cni','passeport','permis','carte_scolaire')),
  document_path text not null,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  ai_review jsonb,
  ai_reviewed_at timestamptz,
  reviewer_id uuid references public.am_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists am_identity_verifications_user_idx on public.am_identity_verifications(user_id, created_at desc);
create index if not exists am_identity_verifications_status_idx on public.am_identity_verifications(status, created_at);

create or replace function public.am_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.am_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.am_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.am_is_verified(uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.am_profiles where id = $1 and verification_status = 'verified');
$$;

create or replace function public.am_prevent_profile_escalation() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role is distinct from new.role and not public.am_is_admin() then raise exception 'Role modification forbidden'; end if;
  if old.verification_status is distinct from new.verification_status and not public.am_is_admin() then raise exception 'Verification modification forbidden'; end if;
  if old.profile_photo_path is distinct from new.profile_photo_path and not public.am_is_admin() then raise exception 'Profile photo is controlled by verification'; end if;
  return new;
end;
$$;

create or replace function public.am_on_auth_user_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.am_profiles (id, first_name, last_name, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'city', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.am_touch_conversation_and_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; listing_target uuid;
begin
  select case when buyer_id = new.sender_id then seller_id else buyer_id end, listing_id into recipient, listing_target
  from public.am_conversations where id = new.conversation_id;
  update public.am_conversations set updated_at = now() where id = new.conversation_id;
  insert into public.am_notifications (user_id, type, title, body, link_path)
  values (recipient, 'message', 'Nouveau message', 'Vous avez reçu un nouveau message.', case when listing_target is null then null else '/annonce/' || listing_target::text end);
  return new;
end;
$$;

create or replace function public.am_sync_public_seller() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status = 'verified' then
    insert into public.am_public_seller_profiles (id, first_name, last_name, phone, city, bio, business_category, business_hours, address, website, contact_email, profile_photo_path, cover_photo_path, updated_at)
    values (new.id, new.first_name, new.last_name, new.phone, new.city, new.bio, new.business_category, new.business_hours, new.address, new.website, new.contact_email, new.profile_photo_path, new.cover_photo_path, now())
    on conflict (id) do update set
      first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone, city = excluded.city,
      bio = excluded.bio, business_category = excluded.business_category, business_hours = excluded.business_hours,
      address = excluded.address, website = excluded.website, contact_email = excluded.contact_email,
      profile_photo_path = excluded.profile_photo_path, cover_photo_path = excluded.cover_photo_path, updated_at = now();
  else
    delete from public.am_public_seller_profiles where id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.am_notify_listing_followers() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    insert into public.am_notifications (user_id, type, title, body, link_path)
    select follower_id, 'system', 'Nouvelle annonce d’un vendeur suivi', 'Une nouvelle annonce est disponible : ' || new.title, '/annonce/' || new.id::text
    from public.am_seller_follows where seller_id = new.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists am_profiles_updated_at on public.am_profiles;
create trigger am_profiles_updated_at before update on public.am_profiles for each row execute function public.am_set_updated_at();
drop trigger if exists am_listings_updated_at on public.am_listings;
create trigger am_listings_updated_at before update on public.am_listings for each row execute function public.am_set_updated_at();
drop trigger if exists am_conversations_updated_at on public.am_conversations;
create trigger am_conversations_updated_at before update on public.am_conversations for each row execute function public.am_set_updated_at();
drop trigger if exists am_profiles_guard on public.am_profiles;
create trigger am_profiles_guard before update on public.am_profiles for each row execute function public.am_prevent_profile_escalation();
drop trigger if exists am_auth_profile on auth.users;
create trigger am_auth_profile after insert on auth.users for each row execute function public.am_on_auth_user_created();
drop trigger if exists am_public_seller_sync on public.am_profiles;
create trigger am_public_seller_sync after insert or update on public.am_profiles for each row execute function public.am_sync_public_seller();
drop trigger if exists am_message_effects on public.am_messages;
create trigger am_message_effects after insert on public.am_messages for each row execute function public.am_touch_conversation_and_notify();
drop trigger if exists am_listing_followers on public.am_listings;
create trigger am_listing_followers after insert on public.am_listings for each row execute function public.am_notify_listing_followers();

alter table public.am_profiles enable row level security;
alter table public.am_public_seller_profiles enable row level security;
alter table public.am_categories enable row level security;
alter table public.am_listings enable row level security;
alter table public.am_conversations enable row level security;
alter table public.am_messages enable row level security;
alter table public.am_reviews enable row level security;
alter table public.am_seller_follows enable row level security;
alter table public.am_notifications enable row level security;
alter table public.am_identity_verifications enable row level security;

create policy "am_profile_self_or_admin_read" on public.am_profiles for select to authenticated using (id = auth.uid() or public.am_is_admin());
create policy "am_profile_self_update" on public.am_profiles for update using (id = auth.uid() or public.am_is_admin()) with check (id = auth.uid() or public.am_is_admin());
create policy "am_public_seller_verified_read" on public.am_public_seller_profiles for select using (true);
create policy "am_categories_public_read" on public.am_categories for select using (active or public.am_is_admin());
create policy "am_categories_admin_write" on public.am_categories for all using (public.am_is_admin()) with check (public.am_is_admin());
create policy "am_listings_public_read" on public.am_listings for select using (status = 'published');
create policy "am_listings_owner_or_admin_read" on public.am_listings for select to authenticated using (owner_id = auth.uid() or public.am_is_admin());
create policy "am_listings_verified_owner_create" on public.am_listings for insert with check (owner_id = auth.uid() and public.am_is_verified(auth.uid()));
create policy "am_listings_owner_or_admin_update" on public.am_listings for update using (owner_id = auth.uid() or public.am_is_admin()) with check (owner_id = auth.uid() or public.am_is_admin());
create policy "am_listings_owner_or_admin_delete" on public.am_listings for delete using (owner_id = auth.uid() or public.am_is_admin());
create policy "am_conversations_members_read" on public.am_conversations for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.am_is_admin());
create policy "am_conversations_buyer_create" on public.am_conversations for insert with check (
  buyer_id = auth.uid()
  and seller_id <> auth.uid()
  and public.am_is_verified(seller_id)
  and exists (select 1 from public.am_listings l where l.id = listing_id and l.owner_id = seller_id and l.status = 'published')
);
create policy "am_messages_members_read" on public.am_messages for select using (exists (select 1 from public.am_conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())) or public.am_is_admin());
create policy "am_messages_members_create" on public.am_messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.am_conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
create policy "am_reviews_public_read" on public.am_reviews for select using (true);
create policy "am_reviews_participant_create" on public.am_reviews for insert with check (
  from_user_id = auth.uid()
  and exists (
    select 1 from public.am_conversations c
    where c.id = conversation_id
      and ((c.buyer_id = from_user_id and c.seller_id = to_user_id) or (c.seller_id = from_user_id and c.buyer_id = to_user_id))
  )
);
create policy "am_follows_self_read" on public.am_seller_follows for select using (follower_id = auth.uid() or public.am_is_admin());
create policy "am_follows_verified_create" on public.am_seller_follows for insert with check (follower_id = auth.uid() and seller_id <> auth.uid() and public.am_is_verified(seller_id));
create policy "am_follows_self_delete" on public.am_seller_follows for delete using (follower_id = auth.uid() or public.am_is_admin());
create policy "am_notifications_self_read" on public.am_notifications for select using (user_id = auth.uid() or public.am_is_admin());
create policy "am_notifications_self_read_mark" on public.am_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "am_verifications_self_read" on public.am_identity_verifications for select using (user_id = auth.uid() or public.am_is_admin());
create policy "am_verifications_self_submit" on public.am_identity_verifications for insert with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketplace-media','marketplace-media',true,5242880,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketplace-identity','marketplace-identity',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;

create policy "am_public_media_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id = 'marketplace-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "am_public_media_update_own_folder" on storage.objects for update to authenticated using (bucket_id = 'marketplace-media' and owner_id = auth.uid()) with check (bucket_id = 'marketplace-media' and owner_id = auth.uid());
create policy "am_public_media_delete_own_folder" on storage.objects for delete to authenticated using (bucket_id = 'marketplace-media' and owner_id = auth.uid());
create policy "am_identity_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id = 'marketplace-identity' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "am_identity_read_own_files" on storage.objects for select to authenticated using (bucket_id = 'marketplace-identity' and owner_id = auth.uid());
create policy "am_identity_delete_own_files" on storage.objects for delete to authenticated using (bucket_id = 'marketplace-identity' and owner_id = auth.uid());

insert into public.am_public_seller_profiles (id, first_name, last_name, phone, city, bio, business_category, business_hours, address, website, contact_email, profile_photo_path, cover_photo_path)
select id, first_name, last_name, phone, city, bio, business_category, business_hours, address, website, contact_email, profile_photo_path, cover_photo_path
from public.am_profiles where verification_status = 'verified'
on conflict (id) do update set updated_at = now();

revoke all on function public.am_is_admin() from public, anon;
revoke all on function public.am_is_verified(uuid) from public, anon;
grant execute on function public.am_is_admin() to authenticated;
grant execute on function public.am_is_verified(uuid) to authenticated;
revoke all on function public.am_set_updated_at() from public, anon, authenticated;
revoke all on function public.am_prevent_profile_escalation() from public, anon, authenticated;
revoke all on function public.am_on_auth_user_created() from public, anon, authenticated;
revoke all on function public.am_sync_public_seller() from public, anon, authenticated;
revoke all on function public.am_touch_conversation_and_notify() from public, anon, authenticated;
revoke all on function public.am_notify_listing_followers() from public, anon, authenticated;

alter publication supabase_realtime add table public.am_messages;
alter publication supabase_realtime add table public.am_notifications;
