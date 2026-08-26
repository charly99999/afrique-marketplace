# Audit et réparation préparatoire — Afrique Marketplace

**Date :** 26 août 2026  
**Portée :** code, GitHub, Vercel, Supabase, KYC, stockage, RLS et build.  
**Statut de production :** **aucune modification de production réalisée pendant cet audit**. Aucun push, fusion vers `main`, déploiement Vercel, migration Supabase ou changement de secret n’a été effectué.

> **Verdict :** l’architecture de production est désormais identifiée sans ambiguïté, mais le service n’est pas encore prêt pour une ouverture large. Les priorités restantes sont la réparation du fournisseur KYC, l’application contrôlée des migrations locales préparées, et les essais réels autorisés avec deux comptes.

## A. Problèmes trouvés

| Priorité | Constat vérifié | Conséquence actuelle |
|---|---|---|
| Critique | Le premier dossier KYC a reçu HTTP 503 avant décision ; un second a reçu HTTP 200 côté fonction mais le fournisseur d’analyse a renvoyé HTTP 404. | Aucun dossier ne peut être approuvé automatiquement tant que le fournisseur n’est pas rétabli ou remplacé. |
| Élevée | La fonction de production séparait mise à jour du dossier, profil, selfie et notification. | Une décision positive pouvait ne pas synchroniser complètement le profil. |
| Élevée | Une politique Storage autorise l’upload anonyme du nom exact de l’icône de marque. | Un visiteur anonyme peut potentiellement injecter ou remplacer cet asset précis. |
| Élevée | Le build public sert encore le canonical `afrique-marketplace.vercel.app`. | Le SEO du domaine officiel `afrique-afrique.com` reste incorrect jusqu’au déploiement validé de la correction locale. |
| Moyenne | Le dépôt conserve la couche tRPC/Express/MySQL historique en parallèle du mode Supabase. | Sans défaut de mode explicite, une configuration incomplète pouvait faire revenir le frontend vers une ancienne architecture. |
| Moyenne | La protection Supabase contre les mots de passe compromis est désactivée. | Le contrôle HIBP n’est pas actif ; l’option signalée requiert un plan compatible. |

## B. Corrections préparées localement

Les corrections suivantes sont disponibles sur la branche locale `fix/publication-auth-seo-bundle`. Elles ne sont pas en production.

| Correctif | Preuve / effet |
|---|---|
| Transition KYC atomique | La migration locale `202608260001_identity_validation_atomic_transition.sql` prépare une seule transaction pour le dossier, `verification_status`, la photo de profil et la notification. |
| Décision automatique stricte | Une validation n’est accordée que si le fournisseur retourne `approve`, une confiance ≥ 85, un document lisible, un selfie exploitable et des informations cohérentes. Tout doute reste `pending`. |
| Reprise sûre | Une indisponibilité de l’analyse rend le même dossier relançable sans créer de doublon ni réenvoyer pièce ou selfie. Une vraie revue humaine ne se relance pas en boucle. |
| Séparation des états KYC | L’interface distingue désormais clairement l’analyse indisponible de la revue humaine et n’annonce pas de faux succès. |
| Photo de profil | Le selfie n’est appliqué comme photo de profil qu’après une approbation complète. |
| Source de vérité frontend | Supabase devient le mode par défaut ; la couche legacy n’est conservée que si `VITE_BACKEND_MODE=legacy` est explicitement choisi. |
| Upload public anonyme | La migration locale `202608260002_remove_anonymous_brand_asset_upload.sql` prépare le retrait de la politique d’upload anonyme de l’asset de marque. |
| SEO et performance | Les commits locaux précédents corrigent canonical/`og:url`, ajoutent le chargement différé des routes et maintiennent tous les chunks sous 500 kB. |

## C. Points volontairement en attente

| Point | Pourquoi il reste en attente |
|---|---|
| Migration Supabase et déploiement de fonction Edge | Ce sont des modifications de base et de logique de sécurité. Elles exigent votre validation explicite préalable. |
| Remplacement complet de Gemini par un KYC open source | Une comparaison de visage fiable et équitable exige un choix de modèle, une évaluation de biais, des seuils, une conservation encadrée et une infrastructure adaptée. Il serait dangereux de simuler ce mécanisme. |
| Correction de la clé/projet/modèle Gemini | Le HTTP 404 ne permet pas de distinguer avec certitude une clé sans accès, une restriction de projet ou un problème fournisseur. La valeur du secret ne doit jamais être affichée dans le chat. |
| HIBP / Leaked Password Protection | La fonctionnalité est indisponible sur le plan actuel selon l’avertissement Supabase. Aucune montée de plan payante n’a été lancée. |
| Tests à deux comptes réels | Ils exigent deux sessions autorisées, un profil effectivement vérifié et une coordination avec un administrateur ; aucun contournement de RLS ou d’identité ne sera utilisé. |

## D. Architecture finale retenue comme source de vérité

| Couche | Source de vérité retenue | État constaté |
|---|---|---|
| Dépôt Git | `charly99999/afrique-marketplace`, branche de production `main` | Vercel déploie ce dépôt ; les corrections nouvelles restent sur branche locale. |
| Frontend web | React/Vite, `VITE_BACKEND_MODE=supabase` | Le bundle Vercel public contient le mode Supabase et la référence au projet de production. |
| Base métier | Supabase `pnyoanxxifswwwrljqce`, schéma `public.am_*` | RLS activée sur les tables actives. Les anciennes tables `listings` ou `kyc_submissions` ne sont pas la base de production actuelle. |
| KYC | `am_identity_verifications` + bucket privé `marketplace-identity` + fonction `verify-identity` | La fonction version 3 est active, mais son fournisseur d’analyse est actuellement défaillant. |
| Administration | Fonction Edge `admin-marketplace`, JWT obligatoire | Les actions d’administration sont contrôlées côté serveur et par rôle. |
| Hébergement | Projet Vercel `afrique-marketplace` | Le domaine officiel répond HTTP 200 ; `www` redirige HTTP 307 vers le domaine racine. |

La couche legacy reste présente dans le dépôt pour éviter une suppression brutale de fonctionnalités, mais elle ne doit plus être sélectionnée par défaut. Elle pourra être retirée progressivement après une campagne de tests complète, pas avant.

## E. Projet Supabase réellement utilisé

Le projet de production est **`pnyoanxxifswwwrljqce`**, nommé **Afrique Marketplace**, en région **eu-west-1** et dans l’état `ACTIVE_HEALTHY`. Les tables métier observées sont `am_profiles`, `am_categories`, `am_public_seller_profiles`, `am_listings`, `am_conversations`, `am_messages`, `am_reviews`, `am_seller_follows`, `am_notifications`, `am_identity_verifications`, `am_listing_favorites` et `am_listing_reports`.

Les buckets vérifiés sont séparés : `marketplace-identity` est privé, limité à 5 MiB et aux images JPEG/PNG/WebP ; `marketplace-media` est public pour les médias d’annonces ; `am-public-assets` est public pour les assets de marque.

## F. Variables utilisées

| Catégorie | Noms attendus | Règle |
|---|---|---|
| Frontend Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_BACKEND_MODE` | Seules l’URL et la clé publishable sont compilées côté navigateur. |
| Supabase Edge Functions | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, optionnellement `GOOGLE_GENERATIVE_AI_MODEL` | Valeurs uniquement côté serveur Supabase ; jamais dans Vite, GitHub ou le navigateur. |
| Déploiement | `packageManager: pnpm`, `vercel.json` avec `pnpm build:cloudflare` et `dist/cloudflare` | Le verrouillage est `pnpm-lock.yaml` ; aucun `bun.lock` n’est présent. |

L’audit Git de noms de fichiers confirme qu’aucun vrai fichier `.env` n’est suivi dans l’historique consulté ; seul `.env.portable.example` est versionné comme modèle sans secret.

## G. Tests réussis

| Vérification locale | Résultat |
|---|---|
| Tests automatisés | **28 fichiers, 104 tests réussis**. |
| TypeScript | Réussi avec `pnpm check`. |
| Build Vite portable | Réussi avec `pnpm build:cloudflare`. |
| Budget bundle | **21 chunks**, maximum **443 504 octets**, inférieur à la limite de 500 000 octets. |
| KYC logique | Validation complète, rejet, maintien en attente, selfie appliqué uniquement après approbation et reprise après fournisseur indisponible couverts localement. |
| Mode backend | Le mode Supabase est testé comme défaut ; le mode legacy nécessite une demande explicite. |

## H. Résultat du build Vercel

Le dernier déploiement production Vercel est `READY`, issu du commit `09b824008d55c968266375eaeb54725a69d72da6` de `main`. Le journal de ce build ne contient pas l’erreur `vite: command not found`; il contient seulement un ancien avertissement de taille de chunk. La configuration versionnée est cohérente : Vite, Node 24.x, pnpm et la commande `pnpm build:cloudflare` sont disponibles.

Le build Vercel déjà en ligne est néanmoins antérieur aux correctifs locaux de canonical, reprise KYC, transition atomique et sécurité Storage.

## I à N. Essais réels : état honnête

| Essai demandé | État | Justification |
|---|---|---|
| Inscription complète | Partiellement vérifié par le code et les tests ; pas de nouvel essai de production réalisé | Aucun compte ou mot de passe réel n’est créé sans accord et suivi explicite. |
| KYC complet | Non validé de bout en bout | Le fournisseur actuel renvoie HTTP 404 ; les documents de membres ne sont pas ouverts ni réutilisés pour des tests. |
| Publication d’annonce | Non validée de bout en bout | La production contient zéro annonce et aucun profil n’est vérifié ; la RLS bloque correctement la création. |
| Message privé | Vérifié statiquement par RLS ; non validé avec deux comptes | Nécessite deux sessions réelles autorisées. |
| Sécurité Storage KYC | Vérifiée statiquement par bucket privé et RLS ; non validée par tentative croisée | Un test croisé exige deux comptes consentants et ne doit jamais utiliser de document réel non nécessaire. |
| Administration | Vérifiée statiquement par JWT et rôle serveur ; non validée dans une session administrateur réelle | Nécessite une session d’administrateur désigné et une action de test réversible. |

## Proposition de séquence avant production

1. Autoriser le **push de la branche de correction et la création d’une PR**, sans fusion ni déploiement.
2. Valider séparément la migration atomique KYC, la suppression de l’upload anonyme et le déploiement de la fonction Edge, après lecture du diff de PR.
3. Réparer ou remplacer le fournisseur KYC. La solution open source proposée utilise des pré-contrôles locaux (caméra, liveness guidée, OCR) et conserve `pending` quand une décision fiable ne peut pas être prise. Elle ne simule jamais une identité vérifiée.
4. Avec deux comptes autorisés, exécuter les essais réels listés ci-dessus, créer au besoin une annonce `TEST QA — à supprimer`, prouver son apparition publique, puis la supprimer.
5. Obtenir une seconde validation explicite de Marc-Arnaud avant fusion vers `main` et toute production.

## Références

[1] [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker) — détection et repères de visage dans image, vidéo et flux caméra.  
[2] [Tesseract.js](https://github.com/naptha/tesseract.js/) — OCR WebAssembly navigateur/Node.js.  
[3] [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) — exécution de modèles ONNX WebAssembly dans le navigateur.  
[4] [Supabase — protection de mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
