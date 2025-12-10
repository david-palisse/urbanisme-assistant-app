
### Bloc 0 – Onboarding & cadrage

**Objectif** : comprendre ce que veut faire l’utilisateur et le mettre au bon endroit dans le flow.

1. **Accueil**
    
    - Bot : _« Bonjour, je vous aide à vérifier si votre projet est compatible avec les règles d’urbanisme et à préparer votre dossier (DP, permis…). Quel type de projet avez-vous ? »_
        
    - Proposer des **catégories cliquables** + champ libre :
        
        - Maison individuelle / extension
            
        - Piscine
            
        - Abri / annexe (garage, carport, abri de jardin…)
            
        - Façade / ouverture / ravalement
            
        - Clôture / portail
            
        - Division parcellaire / lotissement
            
        - Changement de destination (local commercial → logement…)
            
        - Autre (précision en texte libre)
            
2. **Clarification du type de travaux**
    
    - Bot : adapter la question selon la catégorie choisie :
        
        - Extension : _« De combien de m² environ ? Sur un ou plusieurs niveaux ? »_
            
        - Piscine : _« Enterrée, hors-sol, couverte ? Surface en m² ? »_
            
        - Abri : _« Surface approximative ? Hauteur max ? »_
            
        - Etc.
            
    - Objectif : **structurer le projet** (type, surfaces, hauteur, emplacement approximatif sur le terrain, etc.).
        

👉 En interne, tu remplis des **slots génériques** :  
`type_travaux`, `surface_creee`, `surface_modifiee`, `hauteur`, `caractere_provisoire`, `usage`, etc.

---

### Bloc 1 – Localisation & contexte réglementaire

**Objectif** : lier le projet à une parcelle + récupérer le contexte PLU.

3. **Adresse**
    
    - Bot : _« À quelle adresse se situe le projet ? »_
        
        - possibilité de choisir sur carte si tu as une intégration.
            
4. **Confirmation localisation**
    
    - Bot (après géocodage) :  
        _« J’ai trouvé : [Adresse complète], parcelle [Référence cadastrale]. Est-ce bien ici ? »_
        
        - Oui → on continue
            
        - Non → re-saisie / recherche sur carte
            
5. **Contexte réglementaire (affiché à l’utilisateur, mais calculé en back)**
    
    - En interne, ton backend récupère :
        
        - Zone PLU/PLUi (U, AU, N, A, etc.)
            
        - Servitudes majeures (ABF, risques, inondation, etc., si dispo)
            
    - Bot :  
        _« Votre terrain est en zone [XXX]. Il est :
        
        - [dans / hors] périmètre de protection de monument historique
            
        - [en / hors] zone à risques (si pertinent) »_
            

---

### Bloc 2 – Vérification détaillée & faisabilité

**Objectif** : comparer projet ↔ règles.

6. **Compléter les infos manquantes sur le projet**
    
    - Bot pose quelques questions **standardisées**, quel que soit le projet :
        
        - _« Le projet est-il accolé à un bâtiment existant ? »_
            
        - _« À quelle distance approximative de la limite de propriété ? »_
            
        - _« À quelle distance de la voie publique ? »_
            
        - _« Conservez-vous un espace vert/jardin significatif ? »_
            
    - Tu adaptes les questions au type de travaux déjà déclaré.
        
7. **Analyse en back**
    
    - Le système combine :
        
        - Règles extraites du PLU pour la zone (via LLM + structuration)
            
        - Données projet de l’utilisateur
            
    - Tu classes le résultat en 3 états :
        
        - `compatible`
            
        - `compatible_a_risque` (doute / dépend de l’interprétation / ABF etc.)
            
        - `probablement_incompatible`
            
8. **Annonce du verdict (avec prudence)**
    
    - Compatible :
        
        > _« Au vu des informations fournies et des règles de la zone, votre projet semble **compatible** avec le règlement d’urbanisme, sous réserve d’analyse définitive par la mairie. »_
        
    - Compatible à risque :
        
        > _« Votre projet semble **possible mais avec des points sensibles** qui pourraient faire l’objet de remarques de la mairie (ex. hauteur, esthétique, recul…). »_
        
    - Probablement incompatible :
        
        > _« Votre projet a de fortes chances d’être **refusé** en l’état (ex : construction en zone naturelle / hauteur excessive / emprise trop importante). »_
        
9. **Proposition d’ajustements (si risque ou incompatibilité)**
    
    - Bot :  
        _« Souhaitez-vous que je vous propose des variantes plus compatibles ? »_
        
        - Oui → suggérer des ajustements chiffrés (surface, hauteur, position, matériaux).
            
        - Non → proposer juste un résumé PDF de l’analyse.
            

---

### Bloc 3 – Type de dossier & obligations administratives

**Objectif** : dire à l’utilisateur _quel dossier_ et _quelles pièces_.

10. **Identification du régime**
    

- En interne, tu déduis :
    
    - `declaration_prealable` / `permis_construire` / `permis_amenager` / `pas_d_autorisation` (cas très limités)
        
- Bot :
    
    > _« Pour ce type de projet, une **[Déclaration Préalable / Permis de Construire / Permis d’Aménager]** est en principe nécessaire. »_
    

11. **Liste des pièces obligatoires**
    

- Bot :
    
    > _« Voici les pièces habituellement demandées pour ce type de dossier :
    
    - Formulaire Cerfa [référence]
        
    - Plan de situation du terrain
        
    - Plan de masse des constructions
        
    - Plan des façades et toitures
        
    - Photos avant projet
        
    - [etc., adapté au cas] »_
        
- Puis :  
    _« Souhaitez-vous que je vous génère une **checklist personnalisée** ? »_
    

12. **Checklist personnalisée**
    

- Bot pose quelques dernières questions pour personnaliser (présence de voisins, vue sur rue, mitoyenneté, etc.) puis sort une checklist claire.
    

---

### Bloc 4 – Accompagnement (standard vs premium)

**Objectif** : transformer l’analyse en service concret.

13. **Choix du niveau d’accompagnement**
    

- Bot :
    
    > _« Que souhaitez-vous maintenant ? »_
    
    - Télécharger un **résumé PDF** de l’analyse (gratuit)
        
    - Être guidé pour **remplir le dossier** (assistance standard)
        
    - **Confier le dépôt et le suivi** (offre premium, si dispo)
        

14. **Assistance standard**
    

- Bot :
    
    - Pose les questions pour remplir les champs du CERFA.
        
    - Résume à la fin et propose :
        
        > _« Je peux générer un brouillon du formulaire + une checklist des plans et photos à fournir. »_
        

15. **Offre premium**
    

- Bot :
    
    - Explique clairement le périmètre :
        
        > _« Dans l’offre premium, nous :
        
        - Vérifions votre dossier
            
        - Assurons le dépôt auprès du service compétent
            
        - Suivons les échanges et vous tenons informé.  
            Ce service est facturé [X € TTC]. »_
            
    - Puis : _« Souhaitez-vous être recontacté / continuer en ligne ? »_
        

---

### Bloc 5 – Gestion des cas flous / incomplets

Toujours prévoir des sorties de secours :

- Si l’utilisateur est vague :
    
    - _« Pour pouvoir analyser les règles, j’ai besoin de : [liste minimale]. Voulez-vous compléter ces informations maintenant ? »_
        
- Si les règles sont vraiment ambiguës (ou données manquantes côté opendata) :
    
    - _« Les données disponibles ne permettent pas une analyse fiable. Je peux toutefois vous préparer une **liste de pièces standard** pour ce type de projet, et vous recommander de contacter le service urbanisme de votre mairie. »_