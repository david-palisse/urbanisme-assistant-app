
Imagine tes blocs principaux :

- 🧑‍💻 **Front / chatbot**
    
- ⚙️ **Backend métier** (ton API)
    
- 🧠 **LLM** (OpenAI ou autre)
    
- 🌍 **APIs externes** (BAN, Cadastre, GPU, etc.)
    
- 🗄️ **Base de données** (projets, règles, logs)
    

### 1.1. Vue d’ensemble (texte + schéma ASCII)

Utilisateur
   ↓
Front / Chatbot
   ↓ (requêtes HTTP / WebSocket)
Backend métier
   ├─→ API BAN (adresse → coords)
   ├─→ API Cadastre / Etalab (coords → parcelle)
   ├─→ Géoportail de l'Urbanisme (parcelle → zonage + PLU)
   ├─→ Géorisques / Culture (risques, patrimoine) [optionnel]
   ├─→ Base de données (cache règles, projets)
   └─→ LLM
         ├─ Extraction des règles PLU → JSON
         ├─ Analyse de faisabilité projet ↔ règles
         ├─ Détermination type de dossier (DP/PC/PA)
         └─ Génération checklist de pièces

### 1.2. Dépendances “fortes”

- **Backend métier** dépend :
    
    - De **BAN** pour géocoder l’adresse
        
    - Du **Cadastre** pour la géométrie de la parcelle
        
    - De **GPU** pour zonage + PLU
        
    - Du **LLM** pour :
        
        - transformer les PDF/texte du PLU en règles structurées,
            
        - raisonner sur le projet.
            
- **LLM** dépend de :
    
    - JSON projet (ce que tu as structuré depuis le chat)
        
    - JSON règles (ce que tu as extrait d’un PLU + éventuellement complété à la main/codé en dur)
        
- **Front** dépend uniquement de ton backend (il ne doit _jamais_ parler directement aux API externes, ni au LLM).