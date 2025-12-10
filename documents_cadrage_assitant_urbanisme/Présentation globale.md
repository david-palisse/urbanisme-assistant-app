
CIBLE : Particulier (1), Architecte (2), Notaire (3), communes? (4)

BESOIN : avoir rapidement des informations sur les règles d'une parcelles et préparer l'envoi d'un dossier à la mairie le cas échéant 

## 1. Clarifier le produit (version MVP)

1. **Chatbot de qualification**
    
    - Questions à l’utilisateur :
        
        - Adresse précise (pour géoloc + PLU)
            
        - Type de projet (ex : extension, piscine, clôture, abri jardin, changement de destination, division parcellaire…)
            
        - Surfaces, hauteur, matériaux, etc.
            
    - Objectif : transformer la description du projet en **données structurées**.
        
2. **Analyse de faisabilité urbanistique**
    
    - À partir de l’adresse : récupérer la zone (ex : U, AU, N, A, secteur spécifique…) + servitudes (ABF, risques, etc.).
        
    - À partir du type de projet : appliquer les règles (retrait par rapport aux limites, COS s’il y en a encore, hauteur max, emprise, stationnement, etc.).
        
    - Réponse au client :
        
        - _Projet a priori possible_ → avec réserves.
            
        - _Projet à risque / non conforme probable_ → expliquer pourquoi, et proposer des variantes (dimensions, position, type de travaux) plus compatibles.
            
3. **Assistant préparation de dossier**
    
    - Identifier le bon type de dossier :
        
        - Déclaration Préalable (DP)
            
        - Permis de Construire (PC)
            
        - Permis d’Aménager (PA)
            
    - Générer :
        
        - Liste des pièces (Cerfa à remplir, plans, photos, notices)
            
        - Checklist personnalisée
            
        - Éventuellement pré-remplir un Cerfa avec les infos utilisateur.
            
4. **Service premium**
    
    - L’utilisateur signe un mandat / donne accord → tu t’occupes :
        
        - De l’envoi (en général via la **plateforme numérique de dépôt des demandes d’autorisation d’urbanisme** ou par courrier recommandé).
            
        - Des échanges avec la mairie / instructeur.
            
        - De tenir l’utilisateur informé (délais, demandes de pièces complémentaires, décision).
            

Pour le MVP, je te conseillerais de te limiter à :

- **Type de projet :** DP / PC simples (extensions, piscines, abris, façades) sur une **zone géographique restreinte** (une ou deux intercommunalités au départ).
    
- **Fonctionnalités :** qualification du projet + type de dossier + checklist de pièces + génération d’un brouillon de CERFA.
    

Tu réduis ainsi la complexité réglementaire et tu testes la valeur.

---

## 2. Les données d’urbanisme (Géoportail, PLU, etc.)

Tu évoques Géoportail et opendata. C’est la bonne direction, mais il y a quelques réalités :

1. **Règlements d’urbanisme**
    
    - Beaucoup de PLU/PLUi sont désormais accessibles :
        
        - via le **Géoportail de l’Urbanisme (GPU)** (données géographiques + règlement pdf)
            
        - parfois via les portails opendata des intercos.
            
    - Problèmes :
        
        - formats hétérogènes (PDF scannés, pas de données structurées unifiées)
            
        - mise à jour pas toujours parfaite
            
        - règles parfois interprétatives / ambiguës (formulation texte).
            
2. **Ce que ton app peut faire raisonnablement**
    
    - Géolocaliser la parcelle à partir de l’adresse.
        
    - Récupérer :
        
        - Zone de PLU (U, N, A… + sous-secteurs).
            
        - Périmètres de protection (ABF, risques naturels, etc.) si disponibles.
            
    - Faire un **résumé automatique** des règles via LLM (à partir du règlement PDF) :
        
        - hauteur max
            
        - emprise
            
        - recul minimal
            
        - matériaux/finitions imposés.
            
3. **Limite à accepter**
    
    - Le LLM ne rendra **jamais** une analyse juridique parfaitement fiable.
        
    - Tu dois te positionner comme **outil d’aide** et non « autorité juridique ».
        
    - Messages clairs du type :
        
        > « Résultat indicatif : seule la décision de la mairie / du service instructeur fait foi. »
        

---

## 3. Risques et contraintes juridiques

C’est le point le plus important si tu veux dormir tranquille.

- **Tu ne peux pas garantir** qu’un projet est « autorisé ».
    
    - Tu peux dire : « au vu des règles, il semble compatible / à risque / probablement refusé ».
        
- Il te faudra :
    
    - CGU béton qui précisent que :
        
        - Tu fournis un **outil d’aide à la préparation**.
            
        - Tu n’es pas responsable des refus ni des conséquences financières.
            
    - Faire attention au vocabulaire utilisé par le chatbot.
        

Pour le **service premium** (gestion du dossier) :

- Là, tu fais une **prestation de service** plus engagée.
    
- Tu dois être très clair sur :
    
    - Ce que tu fais : remplir les formulaires, compiler les pièces, déposer le dossier, suivre les échanges.
        
    - Ce que tu ne fais pas : garantie d’obtention, conseil juridique équivalent à un avocat/architecte.
        

Tu auras intérêt à consulter un **avocat ou juriste spécialisé en urbanisme / responsabilité** avant d’ouvrir au public, ne serait-ce que pour valider CGU + mentions légales.

---

## 4. Architecture technique (vue simple)

### 4.1. Front / chatbot

- Interface web (React, Vue, etc.) + chatbot style Intercom.
    
- Authentification simple (email + mot de passe, ou social login).
    
- Flow de questions guidées (type « assistant formulaire ») :
    
    - Pas un « chat libre » au début → tu veux des données propres.
        

### 4.2. Backend

- API qui gère :
    
    - Appels à l’API de géocodage (adresse → coordonnées → parcelle).
        
    - Appels à Géoportail / GPU / opendata.
        
    - Stockage des conversations et des dossiers.
        
    - Appels au LLM (OpenAI ou autre).
        
- Base de données :
    
    - Utilisateurs
        
    - Projets
        
    - Paramètres extraits des règlements (si tu veux les « cacher » localement pour ne pas les reparser à chaque fois).
        

### 4.3. LLM

Tu peux structurer en deux étapes :

1. **Extraction des règles**
    
    - Prompt pour transformer un règlement (ou un extrait) en JSON structuré :
        
        `{   "zone": "U",   "hauteur_max": 9,   "recul_limite_separative": 3,   "recul_voie": 5,   "emprise_max": 0.4,   "observations": "Toiture obligatoire en tuiles, pente 30-45°" }`
        
    - Stockage de ce JSON pour réutilisation.
        
2. **Raisonnement sur un projet concret**
    
    - Prompt qui prend :
        
        - Projet utilisateur structuré
            
        - JSON de règles
            
    - Et génère:
        
        - Analyse (compatible / à risque / incompatible)
            
        - Liste des points bloquants
            
        - Variantes possibles.
            

---

## 5. Modèle économique et offre premium

### Gratuit / entrée de gamme

- Diagnostic rapide :
    
    - Projet compatible / à risque / info manquante.
        
    - Type de dossier (DP/PC).
        
    - Liste des pièces obligatoires.
        
- Possibilité de télécharger un **résumé PDF** (branding pour toi).
    

Ça te sert de canal d’acquisition.

### Premium

Plusieurs options :

1. **Pack “Dossier prêt à déposer”**
    
    - Tu demandes toutes les infos nécessaires.
        
    - Tu génères :
        
        - CERFA prérempli.
            
        - Note descriptive.
            
        - Liste des plans à fournir (avec gabarit, si possible).
            
    - Prix fixe par dossier (par exemple 49–149 € selon la complexité).
        
2. **Pack “Gestion complète du dossier”**
    
    - Tu prends en charge :
        
        - Dépôt numérique/papier.
            
        - Réponses aux demandes de pièces complémentaires (en collaboration avec l’utilisateur).
            
        - Suivi des délais.
            
    - Prix :
        
        - Forfait + éventuellement success fee (en cas d’obtention), à voir avec un juriste (attention réglementation).
            
3. **Abonnement pro (phase 2)**
    
    - Cibler des artisans, maîtres d’œuvre, architectes, agents immobiliers.
        
    - Ils utilisent ton outil pour préqualifier les projets de leurs clients.
        

---

## 6. Prochaines étapes concrètes

Si tu veux avancer de façon pragmatique, je te conseille :

1. **Choisir un territoire pilote**
    
    - 1 ou 2 intercommunalités où :
        
        - Les PLUi sont disponibles sur le Géoportail de l’Urbanisme.
            
        - Tu connais un peu le terrain / les contacts.
            
2. **Faire 3–5 parcours utilisateur complets “à la main”**
    
    - Trouver quelques particuliers qui ont un projet (ou des projets fictifs mais réalistes).
        
    - Simuler ton service en mode “concierge” :
        
        - Toi, tu vas chercher les règles.
            
        - Tu analyses et tu construis la checklist.
            
        - Tu notes comment tu raisonnes → ce sera la base pour les prompts LLM.
            
3. **Prototyper un mini chatbot**
    
    - Même sans branchement Géoportail au début :
        
        - Questions projet
            
        - Analyse simple basée sur des règles que tu connais pour une seule zone (ex : zone U d’un PLU).
            
    - Tester la manière de poser les questions pour éviter les réponses floues.
        
4. **Travailler les CGU / l’aspect légal**
    
    - Esquisser CGU + mentions légales.
        
    - Prévoir une consultation juridique dès que tu as une première version qui marche.
        
5. **Décider où tu veux être dans 1 an**
    
    - Simple assistant de préparation de dossiers ?
        
    - Ou véritable plateforme de **workflow** entre particuliers, pros et mairies ?