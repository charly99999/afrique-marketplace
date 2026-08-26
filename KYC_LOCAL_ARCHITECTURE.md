# Architecture KYC autonome proposée

## Objectif et périmètre

Le parcours reste strictement fondé sur un document choisi par le membre et un selfie pris directement avec la caméra. Le navigateur ne peut pas approuver seul une identité : il réalise des **pré-contrôles locaux** pour éviter les soumissions manifestement inexploitables, puis le serveur décide uniquement à partir de résultats mesurables et enregistrés.

| Étape | Exécution proposée | Résultat attendu | Limite de sécurité |
|---|---|---|---|
| Capture selfie | Client, via caméra existante | Image récente, sans import depuis la galerie | Une image caméra seule ne prouve pas la présence vivante. |
| Liveness guidée | Client, MediaPipe Face Landmarker | Un visage, séquence clignement ou orientation demandée, qualité minimale | Échec ou doute conduit à `pending`, jamais à `approved`. |
| Pré-contrôle document | Client, OCR WebAssembly | Image lisible, texte détecté, correspondance limitée avec les champs déclarés | L’OCR ne prouve ni l’authenticité du document ni l’identité. |
| Analyse serveur | Fonction dédiée ou service de vision contrôlé | Vérification des mesures, anti-répétition, journal de décision | Le serveur ne fait confiance à aucun booléen envoyé par le client. |
| Décision | Transition atomique Supabase | `approved`, `pending` ou `rejected`, profil et selfie synchronisés | `approved` exige l’ensemble des contrôles configurés et une décision traçable. |

## Règles de décision

> Un dossier n’est jamais approuvé parce que deux noms se ressemblent ou parce qu’un visage a seulement été détecté.

Un dossier devient `approved` seulement lorsque les contrôles disponibles ont tous abouti : document lisible, selfie avec un seul visage, défi caméra réussi, concordance minimale du texte déclaré, comparaison biométrique seulement si un modèle évalué est activé, et absence de signal d’abus. La transition applique alors `verification_status = verified`, le badge et `selfie_path` comme photo de profil en une seule opération.

Une soumission incomplète, un faible score, une indisponibilité du service ou une information ambiguë garde le dossier à `pending` et l’oriente vers une revue humaine. Un document manifestement vide, plusieurs visages, une image inutilisable ou un échec de liveness produit `rejected` avec une nouvelle soumission possible selon une limite de tentatives.

## Modèles et déploiement

MediaPipe Face Landmarker convient au contrôle de présence, d’unicité du visage, de qualité et au défi caméra. Tesseract.js convient à l’extraction locale de texte. Ces composants sont des pré-contrôles et peuvent être chargés à la demande afin de ne pas alourdir le catalogue public.

La comparaison de visage et l’anti-fraude nécessitent un modèle ONNX évalué, des seuils documentés, un mécanisme de recours et un hébergement serveur contrôlé. Ils ne seront pas ajoutés sans choix explicite de modèle, évaluation des biais, test sur appareils Android et validation de déploiement. Le mode de repli sûr est donc `pending` avec revue humaine, jamais une validation silencieuse ou automatique par défaut.

## Changements à préparer localement

La mise en œuvre doit introduire un journal de mesures KYC sans image ni embedding en clair, une limite de tentatives, un statut explicite côté membre, ainsi qu’une transition de décision atomique déjà préparée dans la migration locale. L’activation d’un modèle de vision local de serveur, d’une migration Supabase, ou d’un nouveau secret est soumise à une validation séparée avant toute production.

## Références

- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- [Tesseract.js](https://github.com/naptha/tesseract.js/)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
