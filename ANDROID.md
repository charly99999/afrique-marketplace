# Version Android — Afrique Marketplace

## État actuel

Afrique Marketplace dispose maintenant d’une plateforme Android Capacitor avec l’identifiant stable `com.afriquemarketplace.app`. Le frontend Vite est embarqué depuis `dist/cloudflare`, tandis que Vercel reste l’hébergement web et Supabase reste le backend en ligne pour Auth, Postgres, Storage, RLS et les fonctions Edge.

Un APK debug **relié à Supabase** a été compilé avec succès le 25 août 2026 :

`android/app/build/outputs/apk/debug/app-debug.apk`

L’APK de test fait environ 4,7 Mo. Son empreinte SHA-256 de contrôle est `101fbfc4108836f818dd0721e0740b76a3776f2286eb7bd8a8addc96c7f387a0`. Il s’agit d’un paquet de test, pas encore d’une version signée pour Google Play.

## Générer l’APK

Après toute modification de l’interface, la commande suivante reconstruit le frontend, le copie dans Android et compile l’APK debug :

```bash
ANDROID_SDK_ROOT="$HOME/android-sdk" \
ANDROID_HOME="$HOME/android-sdk" \
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" \
pnpm android:apk
```

La commande courte `pnpm android:sync` reconstruit seulement les ressources web et synchronise Capacitor. La commande `pnpm android:open` ouvre le projet dans Android Studio lorsqu’il est installé.

## Fonctions et permissions

Le manifeste Android déclare Internet, caméra, images média pour les versions récentes et lecture externe pour les anciennes versions Android. Ces permissions servent aux parcours selfie, document, photo de couverture et médias d’annonce. Les documents d’identité ne sont pas stockés dans l’APK : ils sont téléversés vers le bucket privé Supabase conformément aux règles RLS existantes.

Les scénarios à tester sur un appareil Android réel sont l’inscription téléphone, la connexion, la caméra selfie, le document, la photo de couverture, la publication, la messagerie, le suivi et le lien d’appel `tel:`. La compilation seule ne remplace pas ces essais matériels.

## APK et Google Play

L’APK debug peut être installé directement sur un appareil autorisé pour les essais. Pour Google Play, il faudra générer un paquet release **AAB**, créer une clé de signature conservée hors du dépôt, configurer les informations de version et vérifier les exigences de confidentialité et de déclaration des permissions. Une clé privée ou un fichier keystore ne doit jamais être ajouté à GitHub.

Capacitor documente le cycle d’ajout de plateforme, de synchronisation et de compilation Android dans son [guide officiel Android][1]. Les exigences de publication Android et le format App Bundle sont décrits dans la [documentation officielle Google Play][2].

## Limites

L’application reste dépendante d’Internet pour les comptes, annonces, messages, médias et vérifications. La transformation Capacitor fournit un paquet Android installable, mais ne transforme pas automatiquement les données Supabase en données hors connexion. Les notifications push natives, la signature release et la publication Play Store constituent des étapes ultérieures.

## Références

[1]: https://capacitorjs.com/docs/android "Capacitor — Android"

[2]: https://developer.android.com/studio/publish "Android Developers — Publish your app"
