-- Correctif de sécurité préparé localement : les visiteurs peuvent lire l’asset
-- de marque public, mais aucun visiteur anonyme ne peut remplacer ou injecter ce fichier.
-- Le téléversement initial doit être réalisé par un outil administratif utilisant
-- une clé serveur, jamais par le navigateur.

drop policy if exists "Public brand asset upload" on storage.objects;
