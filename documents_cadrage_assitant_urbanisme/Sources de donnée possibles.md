
# 🟦 1. Les sources OFFICIELLES incontournables

## ✅ **1. Géoportail de l’Urbanisme (GPU)**

👉 **La source principale pour les PLU/PLUi, zonages, servitudes, documents réglementaires.**

- **Site :** [https://www.geoportail-urbanisme.gouv.fr](https://www.geoportail-urbanisme.gouv.fr)
    
- **API / flux :** WMS, WMTS, fichiers SIG (GeoJSON, SHP), téléchargement direct.
    
- **Ce que tu peux obtenir :**
    
    - Zonage du PLU (codes U, AU, N, A, + sous-zones)
        
    - Servitudes d’utilité publique (SUP)
        
    - Règlements PDF du PLU/PLUi
        
    - Périmètres ABF / monuments historiques (selon intégration locale)
        
    - Données géographiques exploitable directement
        

**Avantages :**

- La plus grande couverture nationale (obligatoire pour les communes).
    
- Formats standard (SIG).
    
- Téléchargement automatique possible pour pré-cache.
    

**Limites :**

- Extraits PDF non structurés → besoin du LLM pour extraction.
    
- Qualité de mise à jour variable selon commune.
    

---

# 🟦 2. Le Cadastre (parcelle, géométrie, adresse)

## ✅ **2. Cadastre / DGFiP (via Etalab)**

👉 Idéal pour récupérer les **parcelles**, **géométries**, **références cadastrales**.

### API Cadastre (Etalab)

- **Données :** [https://cadastre.data.gouv.fr](https://cadastre.data.gouv.fr)
    
- **API :** https://cadastre.data.gouv.fr/api
    
- **Formats :** GeoJSON, WMS, WFS
    
- **Ce que tu obtiens :**
    
    - Parcelles (polygones exacts)
        
    - Sections, feuilles
        
    - Numéros cadastraux
        

### Ancien site cadastre.gouv.fr (visualisation)

- Pas d’API publique, mais utile pour vérification visuelle.
    

---

# 🟦 3. IGN – Géolocalisation, cartes, géoservices

## ✅ **3. API Géoportail / IGN**

👉 Pour géocodage, cartes, couches diversifiées.

- **API Géoportail** : [https://geoservices.ign.fr](https://geoservices.ign.fr)
    
- **Services utiles :**
    
    - **Géocodage / reverse-geocoding** (trouver adresse → coords → parcelle)
        
    - **WMS/WFS** pour couches cartographiques supplémentaires
        
    - **Plan IGN**, photos aériennes
        
    - **Limites administratives, réseaux, altimétrie…**
        

---

# 🟦 4. Opendata local (Intercommunalités, métropoles)

## ⚠️ **4. Portails OpenData des EPCI / métropoles / départements**

👉 Souvent les PLUi sont disponibles **aussi** ici, parfois mieux structurés que sur GPU.

Exemples utiles :

- **Grand Paris, Bordeaux Métropole, Rennes Métropole, Nantes Métropole**
    
- **Départements et régions** (serveurs SIG, geoserver, OpenDataSoft)
    

**Tu y trouveras parfois :**

- Zonages complémentaires spécifiques (ZPPAUP, PPRI, etc.)
    
- Données structurées mieux mises à jour (GeoJSON direct)
    
- Servitudes locales
    
- Plans de prévention des risques (PPR)
    

⛔ **Mais attention :**  
Pas d’uniformité → chaque territoire a son format.

---

# 🟦 5. Patrimoine et protection – données ABF, monuments historiques

## ⚠️ **5. Base Mérimée / Monuments Historiques (Ministère Culture)**

👉 Pour savoir si la parcelle est dans un périmètre de protection.

- **API / données :** [https://data.culture.gouv.fr](https://data.culture.gouv.fr)
    
- **Données :**
    
    - Localisation des monuments historiques
        
    - Périmètres de protection (rayon 500 m)
        
    - Servitudes patrimoniales
        

**Attention :**  
Le vrai périmètre ABF (arrêté de délimitation) n’est pas toujours public → dépend du GPU ou de données locales.

---

# 🟦 6. Risques naturels et servitudes

## 🔥 **6. Géorisques (Ministère de l’Écologie)**

👉 Pour récupérer PPR, zones inondables, mouvements de terrain…

- **Site :** [https://www.georisques.gouv.fr](https://www.georisques.gouv.fr)
    
- **API :** https://www.georisques.gouv.fr/donnees/api
    
- **Données disponibles :**
    
    - Zones inondables
        
    - Sismicité
        
    - Retrait-gonflement argiles
        
    - PPRn / PPRt (risques naturels et technologiques)
        

Très utile pour signaler les contraintes projet → mais pas directement liées au PLU obligatoire.

---

# 🟦 7. Adresse & géocodage général

## ✅ **7. Base Adresse Nationale (BAN)**

👉 Pour convertir une adresse → coordonnées → parcelle.

- **API :** https://api-adresse.data.gouv.fr
    
- **Données :**
    
    - Géocodage
        
    - Normalisation adresse
        
    - Reverse géocoding
        

**Super efficace et gratuit.**

---

# 🟦 8. Observatoire national des servitudes d’utilité publique (SUP)

## ⚠️ **8. Servitudes d’utilité publique (SUP)**

👉 Données très intéressantes, mais pas toujours centralisées.

- Certaines sont dans **GPU** (meilleur point d’entrée)
    
- Certaines sur **geoservices IGN**
    
- Certaines sur **portails locaux**
    

Types de SUP :

- SUP_PPR (risques)
    
- SUP_AC1 (monuments historiques)
    
- SUP_AS3 (alignement)
    
- etc.
    

Ton backend devra être flexible car les SUP ne sont pas uniformément disponibles.

---

# 🟦 9. Autres sources secondaires (optionnel)

|Source|Ce que tu peux en tirer|Notes|
|---|---|---|
|**OpenStreetMap (Overpass API)**|Bâti existant, typologie du quartier|Complément utile mais non réglementaire|
|**BD TOPO / BD ORTHO (IGN)**|Haute précision géographique|Certaines données payantes|
|**Registres locaux**|Plans réseaux, contraintes locales|Très variable|

---

# 🟩 Synthèse : les API essentielles pour ton app

### 🎯 **Priorité 1 (obligatoires)**

|Usage|Source|
|---|---|
|Zonage PLU|**Géoportail Urbanisme (GPU)**|
|Servitudes|**GPU**, Mérimée, Géorisques|
|Parcelles|**Cadastre / Etalab**|
|Géocodage adresse|**BAN**|
|Plans, cartes|**IGN Géoportail**|

### 🎯 **Priorité 2 (selon territoire)**

|Usage|Source|
|---|---|
|Données PLUi mieux structurées|OpenData métropoles / EPCI|
|Risques|Géorisques|
|Patrimoine|Base Mérimée|