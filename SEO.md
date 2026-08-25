# Référencement public — Afrique Marketplace

## Périmètre publié

Les moteurs de recherche peuvent découvrir exclusivement l’accueil et le catalogue public. Le fichier `robots.txt` pointe vers `sitemap.xml` et interdit l’exploration des espaces Compte, Profil, Suivis, Vérification, Publication, Messages et Administration. Ces mêmes routes reçoivent également une directive `X-Robots-Tag` côté Vercel et une métadonnée HTML `noindex,nofollow,noarchive` après le rendu de l’application.

> Les documents d’identité, selfies et routes d’administration ne figurent dans aucun sitemap et ne doivent jamais y être ajoutés.

## Étape propriétaire : Google Search Console

La propriété de préfixe d’URL `https://afrique-marketplace.vercel.app/` est **validée** dans Google Search Console par le fichier HTML publié de manière persistante à la racine publique. Ce fichier ne doit pas être supprimé. Le sitemap `https://afrique-marketplace.vercel.app/sitemap.xml` est également **envoyé et accepté** par Google, avec deux pages publiques découvertes au moment de la soumission. Google continuera de le relire périodiquement ; l’indexation des pages reste toutefois à sa discrétion. [1] [2]

Un domaine personnalisé devra remplacer l’adresse `vercel.app` avant toute campagne de visibilité importante. À ce moment, il faudra remplacer l’origine dans `client/src/lib/seo.ts`, `client/public/robots.txt` et `client/public/sitemap.xml`, puis ajouter le nouveau domaine comme propriété Search Console.

## Contrôles après soumission

Le propriétaire devra vérifier dans Search Console que `robots.txt` reste accepté, que le sitemap ne contient que les routes publiques et que les pages `/compte`, `/messages`, `/verification` et `/administration` ne sont pas indexées. Google recommande d’utiliser l’inspection d’URL ou une demande de nouvelle exploration après une mise à jour importante. [2]

## Références

[1]: https://search.google.com/search-console/about "Google Search Console"
[2]: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl "Google Search Central — demander une nouvelle exploration"
