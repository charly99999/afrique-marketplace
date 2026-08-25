# Exigences de publication Android vérifiées

Les informations suivantes ont été vérifiées le 25 août 2026 dans la documentation officielle Android.

Android exige qu’une application distribuée soit signée avec un certificat. Pour Google Play, un Android App Bundle doit être signé avec une clé d’envoi avant son téléversement ; Play App Signing prend ensuite en charge la signature de distribution. Une distribution APK hors Play doit également utiliser un APK signé. Référence : https://developer.android.com/studio/publish/app-signing.

Google Play utilise les Android App Bundles pour générer et servir des APK optimisés selon l’appareil. Pour une nouvelle application, le format AAB est le format de publication attendu sur Google Play. Référence : https://developer.android.com/guide/app-bundle.

État Afrique Marketplace : l’APK debug relié à Supabase est compilé et valide, mais aucune clé release privée n’est encore configurée. Il ne doit donc pas être présenté comme une version finale Google Play. Une version publique nécessite une clé de signature protégée hors GitHub, un build release/AAB, les informations de l’application dans Play Console et une validation minimale sur appareil réel avant diffusion large.
