
## Pipeline automatique : de l’adresse à l’analyse & dossier

### Étape 0 – L’utilisateur parle avec le chatbot

**Entrée utilisateur :**

- Description libre du projet
    
- Adresse
    

**Backend fait deux choses :**

1. Transforme vers un **`project_structuré`** (via tes propres questions + éventuellement le LLM pour nettoyer la description libre).
    
2. Lance le pipeline “geo / PLU”.
    

---

### Étape 1 – Géocodage de l’adresse

1. Le backend appelle **API BAN** avec l’adresse texte.
    
2. Il récupère :
    
    - adresse normalisée,
        
    - coordonnées (lat/lon),
        
    - éventuellement code INSEE / commune.
        
3. Il stocke ça dans ton modèle `ContexteParcelle` (partie adresse + coords).
    

**En cas d’échec :**

- demander une correction à l’utilisateur.
    

---

### Étape 2 – Identification de la parcelle cadastrale

1. Avec les coords (BAN), ton backend appelle **API Cadastre / Etalab** (WFS ou autre).
    
2. Il récupère :
    
    - la/les parcelles intersectées,
        
    - géométrie (polygone),
        
    - référence cadastrale.
        
3. Mise à jour de `ContexteParcelle` :
    
    - `referenceCadastrale`
        
    - `parcelleId`
        
    - `geomParcelle` (pour d’éventuels calculs / distances / emprise).
        

**Dépendances :**

- BAN → Cadastre (car tu pars des coords fournies par BAN).
    

---

### Étape 3 – Récupération du zonage + documents PLU

1. Avec la géométrie de la parcelle ou la commune, ton backend interroge **Géoportail de l’Urbanisme (GPU)** :
    
    - couche de zonage PLU/PLUi
        
    - éventuellement SUP (servitudes)
        
    - liens vers les documents PLU (PDF)
        
2. Tu obtiens :
    
    - `zonePLU` (ex : U, Ua, N, etc.)
        
    - `sousZonePLU`
        
    - URLs des règlements (PDF/HTML)
        
    - éventuellement des métadonnées (date, type de doc)
        
3. Tu complètes `ContexteParcelle` :
    
    `{   "zonePLU": "Ua",   "sousZonePLU": "Ua1",   "sourcesReglementaires": [     { "type": "PLUi", "url": "...", "dateMiseAJour": "..." }   ] }`
    

🔁 **Stratégie intelligente :**

- Quand tu récupères pour la première fois un PLU/zone (ex : “PLUi_Métropole_X / zone Ua”), tu :
    
    - télécharges le PDF,
        
    - l’envoies au LLM pour extraction des règles → objet `ReglesUrbanisme`,
        
    - le stockes dans ta BDD.
        
- Pour les appels suivants sur la même zone, tu **réutilises** cet objet sans rappeler le LLM pour extraction.
    

---

### Étape 4 – Enrichissement : risques & protections (optionnel mais puissant)

En parallèle ou juste après :

1. **Géorisques**
    
    - Tu appelles l’API avec la coordonnée ou la commune.
        
    - Tu récupères : PPR, inondation, sismicité, argiles…
        
    - Tu ajoutes des flags dans `servitudes` :
        
        `"servitudes": {   "zoneInondable": true,   "zoneRisques": ["inondation", "argile"] }`
        
2. **Patrimoine (Base Mérimée / GPU)**
    
    - Tu détermines si la parcelle est dans un rayon / périmètre ABF.
        
    - Tu ajoutes :
        
        `"servitudes": {   "enZoneABF": true,   "distanceMonumentHistorique": 230 }`
        

Ça nourrit ensuite l’analyse, notamment sur l’aspect esthétique / contraintes supplémentaires.

---

### Étape 5 – Construction des entrées pour le LLM

À ce stade, ton backend a :

- `projectStructuré` (ce que l’utilisateur veut faire)
    
- `contexteParcelle` (zone, servitudes, etc.)
    
- `reglesUrbanisme` (déjà extraites et structurées, sinon à extraire une fois pour toutes)
    
- (optionnel) un **flag** pour dire si les données sont complètes ou approximatives.
    

Tu prépares alors un **appel LLM orchestré** en plusieurs sous-tasks :

1. **Task 1 – Analyse de faisabilité**  
    Input :
    
    - `projectStructuré`
        
    - `reglesUrbanisme`
        
    - `contexteParcelle.servitudes`
        
    
    Output :
    
    - `analyseFaisabilite` (JSON de type `ResultatFaisabilite`)
        
2. **Task 2 – Détermination du type de dossier**  
    Input :
    
    - `projectStructuré`
        
    - `reglesUrbanisme`
        
    - (et éventuellement `analyseFaisabilite`)
        
    
    Output :
    
    - `typeDossier` (JSON simple avec `typeDossier`, `motifs`, `niveauConfiance`)
        
3. **Task 3 – Checklist de pièces**  
    Input :
    
    - `projectStructuré`
        
    - `typeDossier`
        
    - éventuellement quelques infos contextuelles (mitoyenneté, façade sur rue…)
        
    
    Output :
    
    - `checklistPieces` (JSON)
        

Tu peux faire ces appels LLM :

- soit en **séquence** (3 appels distincts),
    
- soit en **un seul gros appel** qui renvoie plusieurs objets — mais pour la fiabilité, je préfère 2 ou 3 étapes séparées.
    

---

### Étape 6 – Synthèse pour le front

Ton backend compose une réponse agréable pour le chatbot à partir des JSON :

- À partir de `analyseFaisabilite` :
    
    - Phrase de résumé (compatible / à risque / incompatible)
        
    - Liste des points clés (pour afficher sous forme de bullets)
        
- À partir de `typeDossier` :
    
    - “En principe, vous devrez déposer une Déclaration Préalable” + mention du niveau de confiance
        
- À partir de `checklistPieces` :
    
    - Table / liste de documents avec “obligatoire / recommandé”
        

Le front n’a pas besoin de connaître la forme interne des règles ou des analyses → il consomme une API REST du style :

`GET /api/projets/{projectId}/analyse → {   "etatFaisabilite": "compatible_a_risque",   "resume": "...",   "typeDossier": "declaration_prealable",   "checklistPieces": [...],   "flags": {     "donnéesReglementairesCompletes": true,     "presenceZoneABF": false,     "presenceZoneRisques": true   } }`

---

### Étape 7 – Stockage & réutilisation

À chaque projet, ton backend :

1. Sauvegarde :
    
    - `projectStructuré`
        
    - `contexteParcelle`
        
    - `analyseFaisabilite`
        
    - `typeDossier`
        
    - `checklistPieces`
        
2. Si une nouvelle **zone PLU** est rencontrée :
    
    - Tu stockes aussi `reglesUrbanisme` (extraction LLM) associées à cette zone.
        
    - Tu y référeras toutes les prochaines fois.
        

Ce qui se construit petit à petit, c’est une vraie **base de règles urbaines structurées**, que tu enrichis au fil des demandes.

---

## Résumé ultra-court du pipeline

1. **User → Front → Backend**  
    → Description projet + adresse.
    
2. **Backend → BAN**  
    → Adresse normalisée + coords.
    
3. **Backend → Cadastre**  
    → Parcelle, réf cadastrale, géométrie.
    
4. **Backend → GPU (+ open data locaux)**  
    → Zone PLU, SUP, PLU PDF + extraction LLM (une fois par zone).
    
5. **Backend → Géorisques / Culture (optionnel)**  
    → Zones à risque, patrimoine.
    
6. **Backend → LLM (x2 ou x3)**  
    → Analyse faisabilité  
    → Type de dossier  
    → Checklist de pièces
    
7. **Backend → Front**  
    → Résumé lisible + données pour poursuivre le chat et/ou générer un dossier.