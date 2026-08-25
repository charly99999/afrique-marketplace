# Migration portable — Afrique Marketplace

## Éléments préparés

Le projet contient désormais un build sans plugin propriétaire dans `vite.cloudflare.config.ts`, une règle SPA Cloudflare Pages dans `client/public/_redirects`, une configuration `wrangler.toml`, un client Supabase sans secret (`client/src/lib/supabaseClient.ts`), un schéma Postgres/RLS/Storage dans `supabase/migrations/`, une Edge Function de vérification et une intégration continue GitHub.

Les adaptateurs concrets de session, profils, annonces, médias, conversations et notifications se trouvent dans `client/src/lib/marketplaceSupabase.ts`. Le catalogue public de l’accueil et de `/annonces` utilise cette couche lorsque `VITE_BACKEND_MODE=supabase`; il conserve le backend actuel par défaut. Cette bascule permet de valider la découverte publique dans un environnement Supabase de préproduction avant de convertir les autres écrans.

> La clé publishable Supabase peut être livrée au navigateur. La **service role key**, la clé du fournisseur IA et les mots de passe de bases de données ne doivent jamais être ajoutés à Git, à Cloudflare Pages ou à une variable `VITE_*`.

## État de migration

La production actuelle continue de fonctionner pendant la préparation. Le runtime existant utilise encore tRPC, Express, MySQL, le stockage S3 et l’IA intégrée ; ils doivent être basculés vers les tables `am_*`, Storage et Edge Functions Supabase avant d’utiliser le build Cloudflare en production. Cette séparation évite une coupure de service et conserve toutes les fonctionnalités pendant le transfert.

Le projet Supabase existant `Afrique-business` contient déjà des tables `profiles`, `listings`, `messages`, `notifications` et des données. La migration fournie utilise donc le préfixe `am_` pour éviter toute collision. **Ne pas l’appliquer sans confirmer que ce projet est bien la cible souhaitée.** Son audit actuel remonte aussi un accès `SECURITY DEFINER` exposé, des fonctions sans `search_path` figé et une protection contre les mots de passe compromis désactivée ; ces éléments doivent être corrigés avant toute réutilisation en production.

## Variables d’environnement

Copiez `.env.portable.example`. Dans Cloudflare Pages, renseignez uniquement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Dans Supabase Edge Functions, renseignez `SUPABASE_SERVICE_ROLE_KEY` et `GOOGLE_GENERATIVE_AI_API_KEY`. Les secrets actuels Manus ne font pas partie de la nouvelle architecture.

## Supabase

1. Confirmez le projet cible, puis appliquez `supabase/migrations/202608250001_afrique_marketplace_portable.sql` avec la CLI Supabase ou le tableau de bord.
2. Activez l’authentification téléphone/mot de passe et renseignez les URL de redirection Cloudflare Pages.
3. Déployez `supabase/functions/verify-identity` avec ses secrets côté serveur.
4. Vérifiez les RLS avec deux comptes réels : propriétaire, acheteur, vendeur, administrateur et utilisateur non connecté.
5. Importez les utilisateurs, profils, annonces et médias existants après une sauvegarde complète. Les documents d’identité doivent être copiés uniquement vers le bucket privé `marketplace-identity`.

## GitHub et Cloudflare Pages

1. Créez un dépôt privé, poussez le code et laissez GitHub Actions exécuter `pnpm check`, `pnpm test` et `pnpm build:cloudflare`.
2. Dans Cloudflare Pages, connectez le dépôt, choisissez la branche `main`, utilisez `pnpm build:cloudflare` et publiez `dist/cloudflare`.
3. Renseignez les deux variables `VITE_SUPABASE_*` dans les environnements Preview et Production, puis vérifiez les routes profondes `/annonce/:id`, `/vendeur/:id`, `/messages` et `/verification`.

## Points avant production

Le branchement des écrans React actuels aux adaptateurs Supabase doit être finalisé après le choix du projet cible, afin de remplacer progressivement les appels tRPC sans interrompre les membres existants. La fonction IA requiert une clé d’un fournisseur externe et doit rester prudente : approbation uniquement à forte confiance, maintien en attente en cas de doute, aucun document exposé publiquement.
