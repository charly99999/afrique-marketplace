# Règles de collaboration et de mise en production

## Protection de `main`

Toute modification doit être développée sur une branche dédiée. Il est interdit de pousser directement sur `main`, de fusionner une branche dans `main` ou de déclencher un déploiement de production sans l’accord explicite et écrit de **Marc-Arnaud**.

## Modifications sensibles

Toute évolution du schéma Supabase, du flow d’authentification ou de la logique de publication doit d’abord être proposée dans une pull request ou un message de validation. La proposition doit décrire l’impact, les tests réalisés et le plan de retour arrière. Elle ne doit pas être appliquée à la production avant validation de Marc-Arnaud.

## Preuves avant validation

Avant une demande de fusion, la branche doit au minimum passer `pnpm check`, `pnpm test`, `pnpm build:cloudflare` et `pnpm check:bundle`. Lorsqu’un correctif concerne la persistance Supabase, la preuve doit aussi confirmer le résultat réel de l’insertion et de la lecture publique, sans exposer de données privées.
