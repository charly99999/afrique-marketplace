# Constatations externes vérifiées — 26 août 2026

## Vercel

- Projet : `afrique-marketplace` (`prj_7orLExVUFaqqUcvCczHKOBRVyKNj`), équipe `team_bdy6BdozUPDcgtLYewAuQZt7`.
- Framework : Vite ; Node.js : `24.x`.
- Dernier déploiement production : `dpl_68uA8uAXnvbu8HQkdcyPnphZMVaF`, état `READY`, issu de `charly99999/afrique-marketplace`, branche `main`, commit `09b824008d55c968266375eaeb54725a69d72da6`.
- Les journaux du dernier build ne contiennent pas `vite: command not found`. Ils signalent uniquement un ancien avertissement de taille de chunk après minification.
- La page Vercel publique répond HTTP 200, mais son HTML sert encore le canonical `https://afrique-marketplace.vercel.app/` et le bundle `index-Dg5hFEua.js`, ce qui confirme que les corrections SEO et bundle présentes seulement sur la branche locale ne sont pas encore en production.
- Une inspection limitée du bundle public confirme que `VITE_BACKEND_MODE=supabase` et la référence au projet `pnyoanxxifswwwrljqce` sont bien compilées. Les valeurs de clés publishables ne sont pas consignées.
- Le 26 août 2026, `https://afrique-afrique.com/` répond HTTP 200 via Vercel et `https://www.afrique-afrique.com/` redirige HTTP 307 vers le domaine racine avant de répondre HTTP 200.

## Supabase

- Projet de production : `pnyoanxxifswwwrljqce`.
- Les tables de production utilisent le préfixe `am_`, notamment `am_profiles`, `am_listings`, `am_identity_verifications`, `am_conversations`, `am_messages`, `am_listing_favorites` et `am_listing_reports` ; toutes ont RLS activée.
- À la date de l’audit, les compteurs remontés sont très faibles : aucun listing, conversation ou message, et un dossier d’identité dans `am_identity_verifications`.
- La fonction Edge active `verify-identity` est version 3 et vérifie le JWT.
- Le journal d’un dossier récent a confirmé que le fournisseur d’analyse a retourné HTTP 404 ; la fonction a enregistré `manual_review` plutôt que d’approuver le dossier.
- Le projet est `ACTIVE_HEALTHY` en `eu-west-1` ; les seules fonctions Edge actives sont `verify-identity` et `admin-marketplace`, toutes deux avec vérification JWT.
- Les politiques RLS observées limitent les dossiers KYC et leurs fichiers privés à leur propriétaire ou à un administrateur ; elles limitent les conversations et messages à leurs participants, les favoris à leur propriétaire et la publication aux profils vérifiés.
- Le bucket `marketplace-identity` est privé, limité à 5 MiB et aux images JPEG, PNG ou WebP. Les buckets de médias et d’assets publics sont séparés.
- L’audit de sécurité Supabase ne signale qu’une protection de mots de passe compromis désactivée ; la fonctionnalité dépend du plan et n’a pas été modifiée.

## Documentation Gemini

- La documentation officielle identifie `gemini-2.5-flash` comme modèle stable, multimodal et compatible avec des entrées image.
- Référence modèle : https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
- Référence API `generateContent` : https://ai.google.dev/api/generate-content

## Piste KYC locale/open source

- MediaPipe Face Landmarker peut traiter image, vidéo ou flux caméra et produire un maillage facial ainsi que des scores d’expressions. Il peut supporter la détection d’un visage, le contrôle « un seul visage » et un défi de liveness par geste guidé, mais il ne constitue pas une preuve suffisante d’identité à lui seul.
- Tesseract.js fournit un OCR WebAssembly exécutable dans le navigateur ou Node.js ; il peut extraire du texte de documents lorsque l’image est lisible, mais ne garantit ni la validité d’un document ni l’égalité de deux visages.
- ONNX Runtime Web exécute des modèles ONNX dans le navigateur avec WebAssembly, y compris sur les navigateurs Android et iOS indiqués comme compatibles. Des modèles de détection et de comparaison de visage nécessiteraient toutefois une sélection, une évaluation de biais/qualité et une validation juridique avant toute décision automatique.
- Conclusion d’architecture : les contrôles locaux peuvent écarter des preuves incomplètes ou incohérentes ; l’approbation automatique ne doit être envisagée qu’après des critères mesurés, conservés et testés, tandis que tout résultat ambigu demeure en revue humaine.

## Modèle visage-document étudié

- Open Model Zoo référence `face-recognition-resnet100-arcface-onnx`, un modèle de reconnaissance faciale ResNet100/ArcFace distribué au format ONNX, avec entrée 112×112 ; son dépôt indique une distribution sous Apache 2.0.
- InsightFace indique que son code est MIT, mais que ses poids entraînés sont réservés à la recherche non commerciale. Les poids `buffalo_l` ne doivent donc pas être embarqués dans une marketplace commerciale sans licence distincte.
- Conséquence : la PR ne peut pas honnêtement intégrer `buffalo_l` comme modèle commercial libre. Le modèle Open Model Zoo est une piste de comparaison à tester, mais il faut vérifier la licence de chaque artefact téléchargé et son prétraitement avant activation automatique.

- Le dépôt `yakhyo/face-recognition` est présenté comme MIT pour son code et fournit des poids ONNX, mais la page consultée ne documente pas suffisamment la taille, le format précis des poids ou leurs droits de redistribution commerciale. Il ne sera donc pas retenu sans vérification directe de chaque artefact.
- Le modèle Open Model Zoo `face-recognition-resnet100-arcface-onnx` est documenté en ONNX avec entrée BGR 1×3×112×112 et sortie d’embedding 512 ; il fait toutefois 261 036 388 octets, ce qui est incompatible avec un chargement mobile ordinaire sans stratégie de téléchargement et de cache dédiée. Sa fiche indique Apache 2.0 pour le modèle distribué.
