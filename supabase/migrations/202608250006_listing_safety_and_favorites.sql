-- Fonctions marketplace : favoris privés et signalements modérables.
create table if not exists public.am_listing_favorites (
  listing_id uuid not null references public.am_listings(id) on delete cascade,
  user_id uuid not null references public.am_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create index if not exists am_listing_favorites_user_idx on public.am_listing_favorites(user_id, created_at desc);

create table if not exists public.am_listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.am_listings(id) on delete cascade,
  reporter_id uuid not null references public.am_profiles(id) on delete cascade,
  reason text not null check (reason in ('fraud','prohibited','inaccurate','harassment','other')),
  details text check (details is null or char_length(trim(details)) <= 1000),
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index if not exists am_listing_reports_status_idx on public.am_listing_reports(status, created_at desc);
create index if not exists am_listing_reports_listing_idx on public.am_listing_reports(listing_id, created_at desc);

alter table public.am_listing_favorites enable row level security;
alter table public.am_listing_reports enable row level security;

drop policy if exists "am_listing_favorites_self_read" on public.am_listing_favorites;
drop policy if exists "am_listing_favorites_self_insert" on public.am_listing_favorites;
drop policy if exists "am_listing_favorites_self_delete" on public.am_listing_favorites;
drop policy if exists "am_listing_reports_self_insert" on public.am_listing_reports;
drop policy if exists "am_listing_reports_self_read" on public.am_listing_reports;
drop policy if exists "am_listing_reports_admin_read" on public.am_listing_reports;
drop policy if exists "am_listing_reports_admin_update" on public.am_listing_reports;

create policy "am_listing_favorites_self_read" on public.am_listing_favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "am_listing_favorites_self_insert" on public.am_listing_favorites for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.am_listings l where l.id = listing_id and l.status = 'published'));
create policy "am_listing_favorites_self_delete" on public.am_listing_favorites for delete to authenticated using (user_id = (select auth.uid()));
create policy "am_listing_reports_self_insert" on public.am_listing_reports for insert to authenticated with check (reporter_id = (select auth.uid()) and exists (select 1 from public.am_listings l where l.id = listing_id and l.status = 'published'));
create policy "am_listing_reports_self_read" on public.am_listing_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "am_listing_reports_admin_read" on public.am_listing_reports for select to authenticated using ((select am_private.am_is_admin()));
create policy "am_listing_reports_admin_update" on public.am_listing_reports for update to authenticated using ((select am_private.am_is_admin())) with check ((select am_private.am_is_admin()));
