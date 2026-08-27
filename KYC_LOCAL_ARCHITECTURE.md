# Architecture KYC autonome proposée

## Objectif et périmètre

Le parcours reste strictement fondé sur un document choisi par le membre et un selfie pris directement avec la caméra. Le navigateur ne peut pas approuver seul une identité : il réalise des **pré-contrôles locaux** pour éviter les soumissions manifestement inexploitables, puis le serveur décide uniquement à partir de résultats mesurables et enregistrés.

| Étape | Exécution proposée | Résultat attendu | Limite de sécurité |
|---|---|---|---|
| Capture selfie | Client, via caméra existante | Image récente, sans import depuis la galerie | Une image caméra seule ne prouve pas la présence vivante. |
| Liveness guidée | Client, MediaPipe Face Landmarker en mode vidéo | Séquence d’environ 4,5 s, au moins 10 observations et variation de pose gauche/droite ≥ 0,16 | Ce liveness navigateur est un pré-contrôle anti-photo, pas une garantie anti-spoofing complète ; échec ou doute conduit à `pending`, jamais à `approved`. |
| Pré-contrôle document | Client, OCR WebAssembly | Image lisible, texte détecté, correspondance limitée avec les champs déclarés | L’OCR ne prouve ni l’authenticité du document ni l’identité. |
| Comparaison locale | ONNX Runtime Web + `mobilenetv2_mcp.onnx` (MobileNetV2, 512 dimensions, 112×112) | Deux visages détectés, recadrés et convertis en embeddings ; similarité cosinus locale | Le modèle est appelé réellement dans le parcours, mais le navigateur ne peut pas autoriser seul une approbation serveur. | 
| Analyse serveur | Fonction dédiée et transition atomique Supabase | Vérification du dossier propriétaire, anti-répétition et conservation du résultat | Le serveur ne fait confiance à aucun score ou booléen envoyé par le client. |
| Décision | Transition atomique Supabase | `approved`, `pending` ou `rejected`, profil et selfie synchronisés | `approved` exige l’ensemble des contrôles configurés et une décision traçable. |

## Règles de décision

> Un dossier n’est jamais approuvé parce que deux noms se ressemblent ou parce qu’un visage a seulement été détecté.

Un dossier devient `approved` seulement lorsque les contrôles disponibles ont tous abouti : document lisible, selfie avec un seul visage, défi caméra réussi, concordance minimale du texte déclaré, comparaison biométrique avec le modèle ONNX appelé et seuil évalué, et absence de signal d’abus. Dans la version actuelle, le score local n’est pas une preuve serveur suffisante ; les dossiers restent donc en revue humaine tant qu’une voie de décision serveur sûre n’est pas validée. La transition applique alors `verification_status = verified`, le badge et `selfie_path` comme photo de profil en une seule opération.

Une soumission incomplète, un faible score, une indisponibilité du service ou une information ambiguë garde le dossier à `pending` et l’oriente vers une revue humaine. Un document manifestement vide, plusieurs visages, une image inutilisable ou un échec de liveness produit `rejected` avec une nouvelle soumission possible selon une limite de tentatives.

## Modèles et déploiement

MediaPipe Face Landmarker convient au contrôle de présence, d’unicité du visage, de qualité et au défi caméra. Tesseract.js convient à l’extraction locale de texte. Ces composants sont chargés à la demande.

La branche intègre et appelle réellement `mobilenetv2_mcp.onnx` via ONNX Runtime Web. Le poids fait environ 8,7 Mo, produit un embedding de 512 dimensions et est chargé depuis `/manus-storage/mobilenetv2_mcp_58f218fa.onnx`. Les images publiques d’exemple `a_01/a_02` et `b_01/b_02` ont produit des sorties finies et des similarités positives supérieures aux paires inter-groupes dans le test CPU. Cela ne constitue pas une validation de performance biométrique en population réelle : seuil, biais, qualité documentaire et résistance aux attaques doivent encore être évalués.

Le liveness actif exige une séquence caméra et une variation gauche/droite ; une capture native sans séquence reste `not_checked`. Ce mécanisme ne doit pas être présenté comme une garantie anti-spoofing complète. Le repli sûr est `pending` avec revue humaine.

## Changements à préparer localement

La branche introduit les pré-contrôles locaux, le modèle ONNX, le liveness guidé, un statut explicite côté membre et une transition atomique déjà préparée dans la migration locale. Aucun embedding n’est envoyé ni conservé en clair. L’activation en production de ces changements, d’une migration Supabase ou d’un nouveau modèle serveur reste soumise à validation.

## Références

- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- [Tesseract.js](https://github.com/naptha/tesseract.js/)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
