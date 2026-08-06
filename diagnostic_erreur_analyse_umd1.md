# Diagnostic — erreurs d'analyse sur la zone UMd1 (PLUm Nantes Métropole)

Ticket Notion : « vérifier erreur analyse umd1 » — deux analyses erronées au
4 Place de la Distillerie, 44470 Carquefou (zone UMd1 du PLUm de Nantes Métropole).

## TL;DR

L'analyse ne « lit » pas le mauvais règlement : elle lit une **extraction LLM erronée
du bon règlement**, stockée en cache (`plu_rules_cache`). L'extraction du PDF du PLUm
(238 pages, ~713 000 caractères, résumé en un seul appel LLM) a :

1. **inversé la règle de la bande constructible secondaire (BCS)** : elle attribue à
   UMd1 l'interdiction de construire en BCS qui appartient en réalité à **UMd2** ;
2. **perdu l'origine de calcul de la BCP** : elle dit « 17 m depuis l'emprise
   publique » alors que le règlement dit « 17 m calculés à partir du recul
   réglementé (5 m) », soit une BCP allant jusqu'à ~22 m de la voie.

Le LLM d'analyse restitue ensuite fidèlement ces règles fausses → verdicts
« hors BCP donc BCS incertaine/interdite → projet refusable/impossible ».
Aucune étape du pipeline ne vérifie l'extraction, et le cache la fige 30 jours.

## 1. Ce que dit réellement le règlement (vérité terrain)

Source : `244400404_reglement_20260518.pdf` (document GPU `bbd773cd80bd547bd6f54cd06952eea1`,
« approuvé par modification simplifiée n°4 | 06 février 2026 »), 2ᵉ partie, zone UM,
pages 72-73 et 77-78. Citations verbatim extraites du PDF (via pdf-parse) :

**B.1.1.1 — implantation / voie, sous-secteur UMd1 :**
- « Les constructions doivent être implantées en respectant un recul de **5 mètres
  minimum** par rapport à l'emprise publique ou à la voie. »
- « Les constructions ainsi que les extensions et réhabilitations […] sont autorisées
  à l'intérieur d'une bande constructible principale d'une profondeur de **17 mètres**. »
- « La bande constructible principale est calculée : soit **à partir du recul
  réglementé (5 mètres maximum)** ; soit à partir d'une ligne d'implantation graphique… »
  → la BCP couvre donc en pratique la bande **5 m → ~22 m** depuis la voie.
- « **Au-delà de la bande constructible principale, il s'agit de la bande constructible
  secondaire dans laquelle les constructions, extensions et réhabilitations sont
  autorisées.** » → en UMd1, construire en BCS est **autorisé**.

**Contraste — sous-secteur UMd2 (paragraphe suivant, page 73) :**
- « Au-delà de cette bande constructible principale, il s'agit de la bande constructible
  secondaire dans laquelle les **constructions nouvelles sont interdites** à l'exception
  des annexes, des extensions limitées, des réhabilitations et des surélévations… »

**B.1.1.2 — limites séparatives, sous-secteur UMd1 (pages 77-78) :**
- En BCP : implantation sur une ou les deux limites latérales, ou retrait ≥ 3 m.
- En BCS : retrait latéral ≥ **moitié de la hauteur, minimum 3 m** (exception :
  parties ≤ 3,50 m et annexes, linéaire ≤ 10 m) ; retrait de fond de parcelle ≥ 8 m
  (même exception) ; parcelles de profondeur < 40 m : retrait de fond ≥ h/2, min 6 m.

### Relecture des deux cas du ticket

| | Cas 1 (H=6 m, 25 m de la voie, en limites) | Cas 2 (H=8 m, 24 m, en limites) |
|---|---|---|
| Position | BCS (25 > 22 m) | BCS (24 > 22 m) |
| Constructibilité BCS | **Autorisée** — l'app a eu tort de la présenter comme incertaine/bloquante | **Autorisée** — idem |
| Retrait latéral BCS | requis h/2 = 3 m → implantation en limite non conforme (point que l'app n'a pas relevé correctement) | requis h/2 = 4 m → le constat « retrait 4 m » de l'app était, lui, correct |

Le cœur de l'erreur signalée par le ticket est donc confirmé : **l'app n'aurait jamais
dû mettre en doute ou interdire la construction neuve en BCS pour UMd1**, ni compter
la BCP depuis la limite d'emprise publique.

## 2. Pourquoi l'analyse se trompe — chaîne de causes

### 2.1 Le pipeline (rappel)

`POST /projects/:id/analyze` → `AnalysisService.analyzeProject()`
(`backend/src/modules/analysis/analysis.service.ts:38`) :
zone via IGN GPU (`plu-zone.service.ts`) → règles via
`PluRulesService.getPluRuleset()` (`plu-rules.service.ts:73`) → prompt d'analyse
(`analysis/llm/prompts.ts`) → verdict LLM, sans post-traitement déterministe
(`rules/post-processing.ts:136` est un no-op sur les règles PLU).

Vérifié pour ce cas : la zone renvoyée par l'IGN au point de Carquefou est bien
`UMd1` (doc GPU `bbd773cd…`), et `selectReglementWrittenMaterialUrl()`
(`plu-rules.service.ts:238`) choisit bien l'unique PDF « reglement » écrit du PLUm.
**La sélection de zone et de document est correcte** — l'hypothèse « l'analyse ne lit
pas le bon règlement » est écartée.

### 2.2 Cause racine : l'extraction LLM du règlement est fausse

`extractPluRulesFromDocument()` (`plu-rules.service.ts:266`) envoie le PDF **entier**
(238 pages) en un seul appel (upload OpenAI Files + Responses API, modèle
`extractionModel`) et demande un JSON compact. Ligne en cache constatée en base locale
(`plu_rules_cache`, zoneCode `UMd1`, insee 44024, modèle `gpt-5-mini`, extraite le
15/07/2026) — son contenu contient précisément les deux erreurs :

- `rules.implantation` : « Constructions, extensions and rehabilitations are authorized
  inside a Bande Constructible Principale (BCP) of depth 17 metres **measured from the
  emprise publique / voie** » — origine de calcul fausse, et **la phrase clé “en BCS les
  constructions sont autorisées” a disparu** ;
- `rules.footprint` + `exceptions[]` : « BCS in some UMd sub-sectors **restrict new
  constructions to annexes, limited extensions, rehabilitations or forbids new
  constructions** », « In UMd1: new constructions in the BCS are **restricted**… » —
  c'est la règle d'**UMd2** (paragraphe adjacent dans le PDF), transférée à UMd1.

Le résumé en un seul passage d'un document de 713 k caractères fusionne les
sous-secteurs adjacents (UMd1/UMd2, à une page d'écart) : compression destructive
classique. Le LLM d'analyse (`prompts.ts:151` injecte ce JSON tel quel) n'a aucun
moyen de corriger — ses verdicts des deux cas sont une restitution fidèle de
l'extraction fausse.

### 2.3 Facteurs aggravants

- **Aucune validation de l'extraction** : `JSON.parse` sans vérification
  (`plu-rules.service.ts:355/617`) ; `rules.zone.code` n'est jamais comparé au
  `zoneCode` demandé ; aucune citation verbatim exigée ni contrôlée.
- **Cache 30 jours par (zoneCode, inseeCode)** (`plu-rules.service.ts:686-696`,
  `schema.prisma:268`) : l'extraction fausse est servie telle quelle pendant un mois,
  et chaque commune du PLUm refait sa propre extraction (résultats potentiellement
  différents pour le même règlement).
- **Aucune règle déterministe** : le questionnaire fournit `distance_voie_publique`
  et `distance_limite_separative`, mais rien dans le code ne calcule la position
  BCP/BCS ni ne vérifie les retraits — tout est délégué au LLM d'analyse.
- **Fallback texte tronqué** : la voie `pdf-parse` coupe à 70 % début / 30 % fin
  (`truncateTextForPrompt`, `plu-rules.service.ts:504`) — le milieu du document
  (les zones U d'un PLUi) serait perdu. Non déclenché ici, mais même famille de risque.
- Divers points fragiles relevés au passage (hors cause de ce bug, à traiter en
  fond de roulement) : fallback silencieux `zones.find(...) || zones[0]`
  (`plu-rules.service.ts:122`) avec clé d'écriture ≠ clé de lecture du cache ;
  échec d'extraction silencieux → analyse « de mémoire » sans avertissement UI
  (`analysis.service.ts:160`, `prompts.ts:151` → `'Non disponibles'`) ; troncature
  brutale à 12 000 caractères du ruleset dans le chat (`analysis-chat.service.ts:182`).

## 3. Plan de correction proposé

Par ordre de priorité :

### P1 — Extraction ciblée par zone (le vrai fix)

Remplacer « PDF entier → 1 résumé JSON » par « texte de la zone → extraction » :

1. Télécharger le PDF et le convertir en texte avec `pdf-parse` (déjà en place).
2. Découper le texte par sections : dispositions générales (1ʳᵉ partie), lexique,
   et la section de la zone demandée (repérage par en-têtes « Zone UM »,
   « Secteur UMd », « Sous-secteur UMd1 » — structure très régulière des PLUi GPU).
3. N'envoyer au LLM d'extraction que : lexique + dispositions communes pertinentes +
   section complète de la zone/du secteur parent (UMd1 + UMd + UM), en demandant pour
   chaque règle une **citation verbatim** du texte source (champ `quote` obligatoire).
4. Vérification a posteriori : contrôler que chaque `quote` existe bien dans le texte
   envoyé (simple `includes()` après normalisation des espaces) ; rejeter/re-extraire
   sinon. Comparer `rules.zone.code` au `zoneCode` demandé.

Bénéfices annexes : appels beaucoup plus petits (résout aussi les 429 TPM sur les
gros PLUi), extraction partageable entre communes du même document.

### P2 — Schéma d'extraction explicite pour les bandes constructibles

Ajouter au JSON d'extraction un bloc structuré, par exemple :

```json
"constructibleBands": {
  "reculVoieMin": 5,
  "bcpDepth": 17,
  "bcpMeasuredFrom": "recul",          // "recul" | "alignement"
  "bcsNewConstructions": "autorisées", // "autorisées" | "interdites" | "sous conditions"
  "bcsExceptions": [],
  "quote": "Au-delà de la bande constructible principale, …"
}
```

avec consigne stricte : ne jamais fusionner des sous-secteurs ; si la règle du
sous-secteur exact n'est pas trouvée, mettre `null` + warning, pas la règle du voisin.

### P3 — Calcul déterministe BCP/BCS côté code

Quand `distance_voie_publique` est renseignée et que `constructibleBands` est extrait :
calculer en TypeScript la position (BCP si `recul ≤ d ≤ recul + bcpDepth`, sinon BCS)
et les retraits requis, et injecter la conclusion dans le prompt d'analyse comme un
fait établi (pattern existant : `rules/post-processing.ts`). Le LLM commente, il ne
« calcule » plus la géométrie réglementaire.

### P4 — Hygiène de cache et observabilité

- Invalider les lignes erronées après déploiement : bump `PLU_RULES_SCHEMA_VERSION`
  (`plu-rules.service.ts:15`) — invalide proprement tout l'existant (prod comprise,
  dont la ligne UMd1/Carquefou 44026).
- Stocker les citations sources dans `rules` pour audit.
- Quand l'extraction a échoué (`pluExtractedRules = null`), l'analyse doit l'afficher
  (bandeau « règlement non exploité — analyse générique ») au lieu de laisser le LLM
  répondre de mémoire.

### P5 — Tests de non-régression

- Fixture avec les citations UMd1/UMd2 ci-dessus : vérifier que le découpage P1
  isole la bonne section et que la vérification des `quote` rejette une extraction
  qui attribue à UMd1 la règle d'UMd2.
- Les deux cas du ticket en test d'intégration de l'analyse (mock LLM d'analyse,
  ruleset réel corrigé en entrée) : le verdict ne doit plus contenir d'interdiction
  BCS ni de BCP « depuis l'emprise publique ».

## 4. Estimation

- P1+P2 : le gros du travail (découpage de texte + prompt + vérification) — ~1 à 2 jours.
- P3 : ~0,5 jour. P4 : quelques heures. P5 : avec P1.

P1/P2/P4 suffisent à corriger le bug du ticket ; P3 le rend structurellement
impossible à reproduire.
