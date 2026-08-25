# Livraison Android release — Afrique Marketplace

## Paquet prêt à installer

L’APK release signé relié au backend Supabase est disponible ici :

`/manus-storage/afrique-marketplace-release_816d4bd9.apk`

Le fichier peut être téléchargé puis installé directement sur un appareil Android après autorisation de l’installation depuis cette source. Son empreinte SHA-256 est :

`d12ff77efaa763c4e99bbcb8c6ab6d102a179e7361ddf770e4cca253aa846e0d`

Le format AAB a également été construit pour une éventuelle publication Google Play, avec l’empreinte :

`cd264788643c5aa9b17e9c400502cbfc64ce1fc9197bbddd38da451b142557d3`

## État de production

L’APK release utilise `com.afriquemarketplace.app`, le frontend compilé en mode Supabase et la clé publishable Supabase uniquement. Aucun service role, mot de passe utilisateur ou secret IA n’est embarqué dans le paquet. Le keystore privé n’est pas dans le dépôt et ne doit jamais être partagé.

Le site web public reste disponible sur https://afrique-marketplace.vercel.app. L’APK et le site utilisent le même backend Supabase en ligne.

La signature release est valide et les contrôles automatisés ont réussi : TypeScript, 80 tests Vitest, build Vite, synchronisation Capacitor, intégrité APK/AAB et absence de marqueurs de secrets privilégiés. La validation physique sur un appareil Android réel ne peut pas être simulée par le build ; elle reste recommandée avant une diffusion massive, en particulier pour la caméra selfie, les permissions médias et le lien d’appel.

## Installation directe

Téléchargez l’APK sur Android, ouvrez-le et autorisez temporairement l’installation depuis le navigateur ou le gestionnaire de fichiers si Android le demande. Cette distribution directe ne fournit pas les mises à jour automatiques de Google Play. Pour chaque mise à jour, il faudra signer avec le même keystore privé et redistribuer le nouvel APK.

Le mot de passe du keystore et le fichier keystore doivent être conservés séparément du dépôt. Leur perte empêcherait de signer les mises à jour de cette application.
