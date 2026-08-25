# Migration portable — Afrique Marketplace

## Éléments préparés

Le projet contient désormais un build sans plugin propriétaire dans `vite.cloudflare.config.ts`, une règle SPA portable dans `client/public/_redirects`, une configuration Vercel dans `vercel.json`, un client Supabase sans secret (`client/src/lib/supabaseClient.ts`), un schéma Postgres/RLS/Storage dans `supabase/migrations/`, les Edge Functions `verify-identity` et `admin-marketplace`, ainsi qu’une intégration continue GitHub.

Les adaptateurs concrets de session, profils, annonces, médias, conversations, notifications, suivis, vérification et administration se trouvent dans `client/src/lib/marketplaceSupabase.ts`. Les écrans Accueil, Catalogue, Profil, Publier, Messages, Suivis, Vérification et Administration utilisent cette couche lorsque `VITE_BACKEND_MODE=supabase`; ils conservent le backend actuel par défaut. Cette bascule permet de valider progressivement le parcours complet sans interrompre l’application legacy.

> La clé publishable Supabase peut être livrée au navigateur. La **service role key**, la clé du fournisseur IA et les mots de passe de bases de données ne doivent jamais être ajoutés à Git, à Vercel ou à une variable `VITE_*`.

## État de migration

Le projet Supabase dédié **Afrique Marketplace** est créé dans l’organisation du propriétaire, en région `eu-west-1`, sous la référence `pnyoanxxifswwwrljqce`. Il est distinct de `Afrique-business`, qui ne doit pas recevoir les tables de cette application. Les migrations `202608250001` à `202608250004` ont été appliquées sur le nouveau projet : elles créent le schéma `am_*`, les buckets `marketplace-media` et `marketplace-identity`, les politiques RLS, les déclencheurs de notifications, les index de clés étrangères et le durcissement des preuves privées.

Le contrôle de sécurité Supabase ne remonte plus d’alerte après le déplacement des fonctions `SECURITY DEFINER` vers le schéma interne `am_private`. Les alertes de performance restantes indiquent uniquement que les index n’ont pas encore servi, ce qui est attendu sur une base neuve sans données. La couche React est désormais raccordée à Supabase pour les parcours principaux ; tRPC, Express, MySQL et le stockage S3 restent uniquement comme voie de repli tant que les tests réels et la bascule Vercel n’ont pas été réalisés.

## Variables d’environnement

Copiez `.env.portable.example`. Dans Vercel, renseignez uniquement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`; activez aussi `VITE_BACKEND_MODE=supabase` au moment de la bascule du catalogue. Dans Supabase Edge Functions, renseignez `SUPABASE_SERVICE_ROLE_KEY` et `GOOGLE_GENERATIVE_AI_API_KEY`. Les secrets actuels Manus ne font pas partie de la nouvelle architecture.

## Supabase

1. Le schéma est déjà appliqué au projet `pnyoanxxifswwwrljqce`. Pour recréer un environnement vierge, exécutez toutes les migrations `202608250001` à `202608250004` dans leur ordre numérique.
2. Activez l’authentification téléphone/mot de passe et renseignez les URL de redirection Vercel dans la configuration Auth du projet.
3. La fonction `verify-identity` est déployée en version 1 avec `verify_jwt=true`. Elle protège les chemins de documents par dossier utilisateur, lit `GOOGLE_GENERATIVE_AI_API_KEY` uniquement dans les secrets chiffrés Supabase et refuse une requête non authentifiée (contrôle HTTP 401 validé). Un test sur un vrai dossier soumis reste requis avant activation opérationnelle à grande échelle ; aucun jeu de preuves artificiel ne doit être créé.
4. La fonction `admin-marketplace` est déployée avec `verify_jwt=true`. Elle vérifie le rôle dans la base côté serveur, remet seulement des URLs signées très courtes pour les preuves privées et traite revue/modération sans exposer la service role key au navigateur.
5. Vérifiez les RLS avec deux comptes réels : propriétaire, acheteur, vendeur, administrateur et utilisateur non connecté. Aucun jeu de données fictif de clients, avis ou vérifications ne doit être créé pour ce contrôle.
5. Importez les utilisateurs, profils, annonces et médias existants après une sauvegarde complète. Les documents d’identité doivent être copiés uniquement vers le bucket privé `marketplace-identity`.

## GitHub et Vercel

1. Créez un dépôt privé, poussez le code et laissez GitHub Actions exécuter `pnpm check`, `pnpm test` et `pnpm build:cloudflare`.
2. Le projet Vercel `afrique-marketplace` est relié au dépôt privé `charly99999/afrique-marketplace`, sur la branche de production `main`. Sa configuration source force `pnpm build:cloudflare`, publie `dist/cloudflare` et applique une réécriture SPA vers `index.html`.
3. Renseignez `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` et `VITE_BACKEND_MODE=supabase` dans les environnements Preview et Production Vercel, puis vérifiez les routes profondes `/annonce/:id`, `/vendeur/:id`, `/messages` et `/verification`.

La préparation Cloudflare Pages est conservée dans le dépôt pour réversibilité, mais n’est plus la cible de publication. Le projet Vercel a été créé et déployé depuis `main` ; la version actuellement accessible répond en HTTPS à `https://afrique-marketplace.vercel.app`. Les variables publiques Supabase restent nécessaires avant de considérer ce déploiement comme la bascule finale.

## Points avant production

Le catalogue public (`/` et `/annonces`) a été compilé et vérifié avec `VITE_BACKEND_MODE=supabase` : sur la base neuve il affiche correctement l’état vide sans requête tRPC résiduelle. Le hook d’authentification global suit désormais la session Supabase dans ce mode. Les parcours Profil, Publier, Messages, Suivis, Vérification et Administration possèdent désormais leur branche React Supabase ; une validation avec deux comptes réels et la configuration des variables Vercel doivent précéder l’activation de production complète. La fonction IA reste prudente : approbation uniquement à forte confiance, maintien en attente en cas de doute et aucun document exposé publiquement.
