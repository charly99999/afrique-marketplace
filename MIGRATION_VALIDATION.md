# Validation de migration — Afrique Marketplace

## Contrôle Vercel initial — 25 août 2026

L’alias de production `https://afrique-marketplace.vercel.app` a répondu HTTP 200 après le déploiement GitHub du commit `8e38048`. Les variables publiques `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` et `VITE_BACKEND_MODE=supabase` sont définies dans les environnements Preview et Production. Le chargement de la page d’accueil ne présente aucune erreur de console et aucune requête tRPC n’a été observée lors de ce premier contrôle anonyme.

La route publique `/annonces` a également été ouverte avec le fallback SPA Vercel. Elle affiche correctement l’état vide Supabase et ne génère aucune erreur de console.

La route `/compte` présente bien les formulaires internes de connexion et d’inscription par téléphone, sans redirection externe ni erreur de console durant le chargement anonyme.

La route `/annonce/00000000-0000-0000-0000-000000000000` accepte un identifiant UUID et affiche l’état de repli attendu lorsqu’aucune annonce publiée n’existe, sans erreur de console.

La route `/vendeur/00000000-0000-0000-0000-000000000000` résout correctement le fallback SPA et limite la réponse à un état public d’indisponibilité, sans aucune erreur de console ni exposition de données privées.

L’audit de sécurité Supabase relancé le 25 août 2026 ne retourne aucune alerte. Cette vérification ne remplace pas les essais autorisés avec deux comptes distincts ni l’exercice contrôlé du parcours de vérification d’identité.

Les fonctions Edge `verify-identity` et `admin-marketplace` sont actives, chacune en version 1 avec vérification JWT activée. Aucun secret de service ni document d’identité n’a été exposé lors de ce contrôle.

Sur la fiche vendeur de production, le contrôle réseau observe une requête REST vers Supabase pour la projection `am_public_seller_profiles` et aucune requête `/api/trpc`.

Le contrôle `pnpm verify:portable`, exécuté avec les trois variables publiques Supabase, est réussi : vérification TypeScript, 77 tests et build Vite portable. Le build Vercel de production déclenché par le commit `8e38048` est `READY`; le seul avertissement non bloquant concerne la taille du bundle JavaScript.

Les essais à deux comptes, la vérification d’identité réelle consentie et la revue des autorisations RLS restent à réaliser avant de déclarer une validation métier complète.
