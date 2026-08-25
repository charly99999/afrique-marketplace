-- Lie strictement les preuves de vérification au dossier Storage du membre authentifié.
drop policy if exists "am_verifications_self_submit" on public.am_identity_verifications;
create policy "am_verifications_self_submit" on public.am_identity_verifications for insert to authenticated with check (
  user_id = (select auth.uid())
  and document_path like (select auth.uid()::text || '/%')
  and selfie_path like (select auth.uid()::text || '/%')
);
