-- Authentification sans SMS : l’application utilise un identifiant email interne
-- et conserve le numéro utilisateur dans les métadonnées Auth et le profil.
create or replace function public.am_on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.am_profiles (id, first_name, last_name, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone),
    coalesce(new.raw_user_meta_data ->> 'city', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
