# Diagnostic - Lecture PLU et corrections pour cas piscine Nantes Métropole

## Pourquoi le PLU n’était pas réellement lu

1) **Le flux d’analyse ne consommait pas de règles PLU structurées** :
   - Le moteur d’analyse utilisait un prompt LLM avec un simple champ `Zone PLU`, sans règles PLU locales ni extraits du règlement.
   - Le cache `PluZoneCache` existe, mais **aucun pipeline n’extrait ni n’injecte les règles PLU** dans l’analyse (pas d’extraction PDF, pas de stockage, pas de lecture).

2) **Données réglementaires incomplètes ou obsolètes au moment de l’analyse** :
   - L’analyse ne rafraîchissait pas systématiquement les infos réglementaires ; elle utilisait parfois les champs persistés en base qui peuvent être vides ou dépassés.

## Correctif apporté (code)

- **Lecture PLU automatisée (tout PLU selon l'adresse)** :
  - Récupération du document PLU via GPU (`document` endpoint) à partir de l’`idurba`/`partition`.
  - Téléchargement PDF + extraction texte (`pdf-parse`).
  - Extraction structurée des règles par LLM, mise en cache par zone/commune.
  - Injection des règles extraites dans le prompt, puis application **post‑LLM** des règles critiques (ex. distance limite séparative, CBS).

- **Mise à jour systématique des infos réglementaires** au moment de l’analyse, avec fallback sur les données en base si l’API échoue.

- **Réduction des faux positifs “zone inondable”** :
  - Si seule l’info “commune exposée” est disponible (GASPAR), on **ne marque pas la parcelle** comme zone inondable. On retourne un statut “à vérifier”.

- **Bruit aérien (PEB)** :
  - Ajout d’un post‑traitement : si zone D, ajout d’une contrainte + document “attestation acoustique”, et statut passe à `compatible_a_risque`.

## Emplacements des changements

- Analyse et injection des règles PLU :
  - [`backend/src/modules/analysis/analysis.service.ts`](backend/src/modules/analysis/analysis.service.ts)

- Extraction et cache PLU (PDF + LLM) :
  - [`backend/src/modules/urbanisme/urbanisme.service.ts`](backend/src/modules/urbanisme/urbanisme.service.ts)

- Ajustement logique zone inondable (éviter faux positifs) :
  - [`backend/src/modules/urbanisme/urbanisme.service.ts`](backend/src/modules/urbanisme/urbanisme.service.ts)

## Effet attendu pour votre cas

- **Piscine enterrée 20m²** → DP (inchangé)
- **Distance limite séparative = 2m** → **incompatible** (min 3m)
- **CBS obligatoire** → mention + document requis
- **PEB zone D** → contrainte + attestation acoustique
- **Zone inondable** → ne doit plus sortir “risque moyen” si seule info commune

## Test minimal (manuel ou e2e)

1) **Mock Urbanisme** :
   - `pluZone.documentName = "PLUm Nantes Métropole"`
   - `GPU document` retourne un `sourceUrl` PDF
   - Extraction renvoie `reglesGenerales.reculLimitesSeparatives.valeurMetres = 3`
   - Extraction renvoie `pool.cbsRequired = true`
   - `noiseExposure.isInNoiseZone = true`, `noiseExposure.zone = "D"`
   - `floodZone` = GASPAR uniquement (pas de PPR retourné)

2) **Questionnaire** :
   - `projectType = POOL`
   - `piscine_surface = 20`
   - `distance_limite_separative = 2`
   - `distance_voie_publique = 15`
   - `position_terrain = arriere`

3) **Vérifier sortie** :
   - `feasibilityStatus = probablement_incompatible`
   - `constraints` contient :
     - "Implantation - limite séparative" (3m)
     - "CBS (Coefficient de Biotope de Surface)"
     - "Bruit aérien (PEB)"
   - `requiredDocuments` contient :
     - `CBS`
     - `ATTEST_ACOUSTIQUE`
