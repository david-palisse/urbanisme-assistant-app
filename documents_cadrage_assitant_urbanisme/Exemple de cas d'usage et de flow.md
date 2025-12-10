
1. **Cas 1 : Piscine dans un jardin en zone urbaine (DP)**
    
2. **Cas 2 : Extension d’une maison en zone protégée ABF (PC possible mais contraintes fortes)**
    
3. **Cas 3 : Abri de jardin dans une zone naturelle (probabilité élevée de refus)**
    

Pour chaque cas :  
→ **Flow conversationnel complet**  
→ **Logique de décision**  
→ **Messages que le chatbot doit renvoyer (ton neutre et clair)**

---

# 🟦 Cas 1 – Piscine dans un jardin en zone urbaine

Objectif : déclarer une **piscine ≤ 100 m², non couverte** → **Déclaration Préalable** si PLU OK.

## 🎤 Flow conversationnel

### 1. Accueil

**Bot :**  
Bonjour ! Quel type de projet souhaitez-vous réaliser ?

- Piscine
    
- Extension
    
- Abri / Annexe
    
- Travaux de façade
    
- Autre
    

### 2. Demande de précision

**User :** Piscine  
**Bot :** Très bien. Est-ce une piscine enterrée, semi-enterrée ou hors-sol ?

**User :** Enterrée.  
**Bot :** Super. Quelle sera la _surface_ de la piscine (en m²) ?

**User :** 32 m².  
**Bot :** Merci. Souhaitez-vous ajouter un abri de piscine ou une couverture permanente ?

**User :** Non.  
**Bot :** Parfait. Pour analyser les règles d’urbanisme, quelle est l’adresse exacte du projet ?

### 3. Vérifications avec les données territoriales

Le bot géocode l’adresse, identifie la parcelle + zone PLU.

**Bot :**  
Voici ce que j’ai trouvé :

- Commune : XXX
    
- Parcelle cadastrale : AB 123
    
- Zone du PLU : **U**
    
- Pas de monument historique ni de protection ABF dans votre rayon
    
- Terrain non situé en zone inondable
    

Est-ce correct ?

- Oui / Non
    

### 4. Analyse de faisabilité

**Bot :**  
D’après les règles de la zone **U**, la construction d’une piscine enterrée de 32 m² est **autorisé sous conditions** :

- Recul minimal par rapport aux limites séparatives : 3 mètres
    
- Recul minimal par rapport à la voie : 5 mètres
    
- Espaces verts à conserver : au moins 20 % de la parcelle
    

Voulez-vous que je vérifie ces conditions avec vous ?

- Oui / Non
    

### 5. Vérification locale (si l’utilisateur accepte)

**Bot :** Votre piscine sera-t-elle à moins de 3 mètres de la clôture ?  
**User :** Non.  
**Bot :** Parfait. Êtes-vous à moins de 5 mètres de la rue ?  
**User :** Non.

### 6. Conclusion

**Bot :**  
Bonne nouvelle ! Votre piscine semble **compatible avec les règles d’urbanisme**.  
👉 Une **Déclaration Préalable** est nécessaire.

Souhaitez-vous :

- Obtenir la **liste complète des documents à fournir** ?
    
- Générer un **dossier pré-rempli** ?
    
- Passer au **service premium** pour que je gère le dépôt et le suivi ?
    

---

# 🟧 Cas 2 – Extension maison en zone ABF (cas complexe avec restrictions)

## 🎤 Flow conversationnel

### 1. Accueil

**Bot :** Quel type de projet souhaitez-vous réaliser ?  
**User :** Une extension.

### 2. Précisions

**Bot :** Merci. De combien de mètres carrés souhaitez-vous agrandir votre maison ?  
**User :** Environ 25 m².

**Bot :** L’extension sera-t-elle :

- En rez-de-chaussée
    
- Surélévation
    
- Extension latérale
    

**User :** Latérale.

**Bot :** Très bien. Quelle est l’adresse du projet ?

### 3. Analyse territoriale

Le bot détecte :

- Zone PLU : **UA**
    
- Terrain **dans le périmètre de protection de 500 m** d’un monument historique
    
- Parcelle en pente → zone de risques mouvements de terrain (si disponible)
    

**Bot :**  
Votre parcelle est située dans le périmètre de protection d’un monument historique.  
➡️ Votre projet devra obtenir l’avis de l’Architecte des Bâtiments de France (ABF).

Est-ce que cela vous convient pour la suite ?

- Oui / Non
    

### 4. Analyse des règles essentielles

**Bot :**  
Voici les principales règles applicables dans la zone **UA** :

- Hauteur max : 9 m
    
- Matériaux de toiture imposés : tuiles canal
    
- Reculs : 3 m côté limite séparative
    
- Harmonisation obligatoire en façade dans la zone ABF
    

Votre extension prévoit-elle :  
➡️ Un étage ?  
➡️ Une toiture différente de la maison existante ?  
➡️ Des menuiseries modernes (alu, grandes baies) ?

**User :** Un étage oui, toit plat, et baie vitrée.

### 5. Conclusion prudente

**Bot :**  
⚠️ Attention : plusieurs points risquent d’être **refusés par l’ABF** :

- **Toit plat** en zone ABF → généralement interdit sauf exceptions
    
- Esthétique très contemporaine → rarement accepté
    
- Hauteur à vérifier : vous atteindrez probablement les 9 m maxi
    

Ce que je peux vous proposer :

- Variante réaliste : **extension à toit tuiles**, baies vitrées modérées
    
- Variante compatible ABF : extension **pente traditionnelle + matériaux locaux**
    
- Ou analyse approfondie avec simulation (service premium).
    

Souhaitez-vous :

- Voir les variantes compatibles ?
    
- Passer à la génération de dossier ?
    
- Arrêter ici ?
    

---

# 🟥 Cas 3 – Abri de jardin dans une zone naturelle (probabilité de refus)

## 🎤 Flow conversationnel

### 1. Accueil

**Bot :** Quel est votre projet ?  
**User :** Abri de jardin.

### 2. Précisions

**Bot :** Quelle surface fera-t-il ?  
**User :** 20 m².

**Bot :** Quelle est l’adresse du terrain ?

### 3. Analyse territoriale

Le bot identifie :

- Zone PLU : **N** (zone naturelle)
    
- Conditions fréquentes : constructions **interdites** sauf exceptions agricoles
    
- Pas de bâtiment existant → pas d’annexe possible
    

### 4. Résultat

**Bot :**  
Votre terrain est situé en **zone naturelle (N)**.  
Dans cette zone, les constructions nouvelles — même petites — sont **généralement interdites**, sauf activité agricole ou forestière.

➡️ Votre abri de 20 m² a de fortes chances d’être **refusé**.

### 5. Propositions réalistes

**Bot :**  
Voici les alternatives possibles :

- Abri **< 5 m²** démontable (parfois accepté si considéré comme mobilier de jardin)
    
- Abri **adossé à un bâtiment existant** (si existant sur la parcelle)
    
- Stockage en **conteneur mobile** (peut être considéré comme non pérenne, selon PLU)
    

Souhaitez-vous explorer une de ces options ?

- Oui / Non
    

---

# 🔵 Synthèse : ce que ton chatbot doit toujours faire

1. **Poser des questions précises** pour éviter le flou.
    
2. **Géolocaliser → PLU → règles → servitudes**.
    
3. **Toujours parler en termes de probabilité / compatibilité**, jamais en certitude juridique.
    
4. **Proposer un plan B** en cas d’incompatibilité.
    
5. **Faciliter ensuite le dossier** (DP/PC/checklist).