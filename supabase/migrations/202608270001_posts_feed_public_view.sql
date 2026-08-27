-- Applied to Supabase production via MCP on 2026-08-27.
-- Public feed view exposes only public posts and non-sensitive author fields.
create or replace view public.posts_feed as
select
  p.id,
  p.user_id,
  p.content,
  p.media_urls,
  p.visibility,
  p.created_at,
  p.updated_at,
  coalesce(nullif(trim(pr.first_name || ' ' || pr.last_name), ''), 'Membre Afrique Marketplace') as author_name,
  pr.profile_photo_path as author_photo_path,
  (pr.verification_status = 'verified') as author_verified
from public.posts p
left join public.am_profiles pr on pr.id = p.user_id
where p.visibility = 'public';

grant select on public.posts_feed to authenticated;
