
## **Pitch fonctionnel**

Nous développons une application intelligente qui simplifie entièrement les démarches d’urbanisme pour les particuliers.  
L’utilisateur décrit son projet (extension, piscine, abri, travaux extérieurs) et indique l’adresse : l’application analyse automatiquement les règles d’urbanisme locales en croisant les données officielles du Géoportail de l’Urbanisme, du cadastre et de l’opendata.

Elle détermine si le projet est compatible, propose des variantes en cas de blocage, identifie le type d’autorisation nécessaire (Déclaration Préalable, Permis de Construire…) et génère une checklist personnalisée des documents à fournir.

En version premium, l’application prend en charge l’intégralité du dépôt du dossier auprès de la mairie et assure le suivi administratif jusqu’à la décision.

En bref : **un assistant urbanisme automatisé**, qui transforme un parcours administratif complexe en une expérience simple, guidée et fiable.

## **Pitch technique**

Nous construisons une plateforme d’assistance automatisée pour les demandes d’autorisation d’urbanisme, basée sur l’analyse en temps réel des données géographiques et réglementaires.

L’utilisateur décrit son projet et fournit une adresse. Notre backend interroge successivement les API publiques (BAN pour le géocodage, Cadastre/Etalab pour la parcelle, Géoportail de l’Urbanisme pour le zonage, les servitudes et les documents du PLU/PLUi). Les règlements PDF du PLU sont automatiquement transformés en règles structurées grâce à un LLM orchestré et mis en cache par zone.

Le moteur d’analyse compare ensuite le projet aux règles extraites : compatibilité, points bloquants, risques (ABF, risques naturels, emprise, hauteurs, reculs…). Une chaîne de prompts spécialisés détermine le type de dossier requis (DP, Permis de Construire ou d’Aménager) et génère une checklist de pièces à fournir, entièrement personnalisée.

La V1 repose sur un backend monolithique (API REST), un orchestrateur LLM et un stockage PostgreSQL. Les versions ultérieures prévoient un service dédié d’indexation PLU, un moteur de règles pré-compilé par territoire, un orchestrateur multi-models et un suivi automatisé des dépôts via les services numériques des collectivités. L’ensemble constitue un pipeline complet « adresse → zonage → règles → faisabilité → dossier ».