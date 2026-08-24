# Montée en charge — Afrique Marketplace

## État actuel

L’application utilise un backend web stateless, une base de données relationnelle et un stockage objet pour les médias. Les photos, selfies, documents et médias d’annonces restent dans le stockage objet ; seules leurs références et métadonnées sont conservées en base. Cette séparation évite de faire grossir la base de données avec des fichiers binaires.

## Ce que signifie « des millions d’utilisateurs »

Le nombre total de comptes ne permet pas, à lui seul, de valider une capacité. Les paramètres déterminants sont le nombre d’utilisateurs simultanés, le volume quotidien de photos et vidéos, la fréquence de recherche et de messagerie, le trafic de téléchargement des médias et la charge de la vérification d’identité.

La configuration actuelle convient à une phase de lancement et doit être accompagnée de mesures réelles avant une ouverture massive. Elle ne constitue pas une garantie de fonctionnement sans dégradation pour des millions d’utilisateurs actifs simultanément.

## Préparation recommandée avant une ouverture massive

| Domaine | Action nécessaire |
|---|---|
| Médias | Servir les fichiers via stockage objet et CDN, puis appliquer des règles de compression, de durée et de quotas. |
| Base de données | Mesurer les requêtes lentes, ajouter les index utiles et prévoir une stratégie de réplication, de sauvegarde et de restauration. |
| Application | Réaliser des tests de charge sur les parcours recherche, annonces, messages et vérification. |
| IA | Mettre les analyses non immédiates dans une file de traitement et surveiller les échecs, délais et coûts par dossier. |
| Sécurité | Mettre en place limitation de débit, détection d’abus, journalisation, contrôle d’accès et procédure de réponse aux incidents. |
| Exploitation | Mettre en place alertes de disponibilité, mesures de latence, suivi des erreurs et tests de reprise. |

> Le passage à grande échelle doit être décidé après une campagne de tests de charge avec des objectifs chiffrés de temps de réponse et de disponibilité.

## Critères explicites de renforcement

Le renforcement de l’infrastructure doit être déclenché si les tests ou la production montrent une saturation durable du processeur ou de la mémoire, une hausse continue des erreurs serveur, ou une dégradation des temps de réponse sur la recherche, la publication ou la messagerie. À titre d’objectifs de départ à valider par test, il faut surveiller une latence au 95e centile supérieure à 1,5 seconde pour les lectures, supérieure à 3 secondes pour les écritures, un taux d’erreur supérieur à 1 %, une file d’analyse IA qui dépasse une minute, ou une consommation média qui rend le transfert lent pour les utilisateurs mobiles.

Le volume total de comptes n’est pas un seuil suffisant. Le bon déclencheur est la combinaison d’utilisateurs simultanés, de trafic média, de charge de base de données et de délai de traitement IA réellement observée.

## Stockage et hébergement

Le stockage objet reste la source de vérité pour les fichiers. Une politique de conservation doit être définie pour les vidéos, les pièces de vérification et les versions inutilisées des médias. Les conditions commerciales, les quotas inclus, le trafic sortant et la disponibilité des options d’hébergement doivent être confirmés auprès de l’assistance de la plateforme avant tout engagement de production à grande échelle.
