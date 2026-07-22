# MonUrba — Plan de communication et marketing

## Sommaire
1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Positionnement et proposition de valeur](#2-positionnement-et-proposition-de-valeur)
3. [Cibles](#3-cibles)
4. [Messages clés](#4-messages-clés)
5. [Levier de lancement : la promotion -50%](#5-levier-de-lancement--la-promotion--50)
6. [Canaux de communication](#6-canaux-de-communication)
7. [Plan de contenu](#7-plan-de-contenu)
8. [Partenariats et acquisition B2B2C](#8-partenariats-et-acquisition-b2b2c)
9. [Email marketing](#9-email-marketing)
10. [Calendrier (juillet 2026 → janvier 2027)](#10-calendrier-juillet-2026--janvier-2027)
11. [Budget indicatif](#11-budget-indicatif)
12. [Indicateurs de succès (KPI)](#12-indicateurs-de-succès-kpi)
13. [Risques et points de vigilance](#13-risques-et-points-de-vigilance)

---

## 1. Contexte et objectifs

MonUrba (mon-urba.fr) vient d'ouvrir : c'est un assistant en ligne qui aide les
particuliers à vérifier la faisabilité réglementaire de leur projet de travaux
(piscine, extension, abri de jardin, clôture, ravalement...), à déterminer le
type d'autorisation d'urbanisme nécessaire (Déclaration Préalable, Permis de
Construire, Permis d'Aménager) et à obtenir la liste des documents et CERFA à
fournir. Le produit est en V1 : un seul pack payant est actif (Pack Étude),
deux autres (Dossier, Premium) sont affichés en "bientôt disponible".

Objectifs de ce plan, sur la fenêtre de lancement (jusqu'au 01/01/2027, date de
fin de la promotion -50% actuelle) :

1. **Notoriété** : faire connaître MonUrba auprès des particuliers qui
   envisagent des travaux soumis à autorisation d'urbanisme.
2. **Acquisition** : générer un flux régulier de visiteurs qualifiés vers
   `mon-urba.fr`, avec un taux de conversion visiteur → compte créé mesurable.
3. **Activation** : convertir les comptes créés en premiers achats du Pack
   Étude, en s'appuyant sur la promotion de lancement comme déclencheur.
4. **Preuve sociale** : accumuler des retours d'usage (avis, témoignages,
   études de cas) pour préparer la communication post-promotion, quand le prix
   repassera à 39 €.

## 2. Positionnement et proposition de valeur

**Positionnement** : MonUrba est l'outil qui transforme une démarche
administrative anxiogène (obtenir l'autorisation d'urbanisme pour ses travaux)
en un parcours guidé, rapide et fiable, sans avoir à décrypter seul le PLU de
sa commune.

**Proposition de valeur** (à décliner sur tous les supports) :
- *Avant MonUrba* : chercher le PLU de sa commune, comprendre un langage
  juridique dense, deviner s'il faut une DP ou un PC, risquer un refus par
  dossier incomplet.
- *Avec MonUrba* : décrire son projet en quelques minutes, obtenir une analyse
  de faisabilité, savoir précisément quelle autorisation déposer et quels
  documents (CERFA inclus) préparer, avec un assistant disponible pour
  répondre aux questions pendant 30 jours après achat.

**Ce que MonUrba n'est pas** (à rappeler pour la confiance, cf. l'avertissement
légal déjà présent sur le site) : ni un cabinet d'architecte, ni une garantie
d'obtention du permis — c'est un outil d'aide à la décision, la mairie reste
seule décisionnaire. Cette honnêteté doit rester un argument de crédibilité
dans la communication, pas une réserve qu'on cache.

## 3. Cibles

### Cible primaire — particuliers avec un projet de travaux
- Propriétaires (ou en cours d'achat) préparant un projet parmi ceux couverts
  en V1 : piscine, extension, abri de jardin/annexe, clôture, ravalement de
  façade.
- Profil : plutôt propriétaires de maison individuelle, 30-65 ans, à l'aise
  avec les démarches en ligne mais peu familiers du jargon urbanistique.
- Moment de vérité : la recherche Google du type "délai permis de construire
  piscine", "déclaration préalable extension maison", "PLU ma commune" — c'est
  le point d'entrée le plus naturel (cf. section SEO).

### Cible secondaire — prescripteurs professionnels
- Pisciniers, constructeurs d'extensions/vérandas, artisans : ils font face à
  la même question réglementaire pour chaque client et peuvent orienter vers
  MonUrba en amont de leur propre devis.
- Architectes, agents immobiliers, notaires : cités comme cibles secondaires
  dès la conception du produit (`technical_plan.md`) ; utile en cas de vente,
  succession ou projet de rénovation à évaluer rapidement. Le contact "offre
  professionnelle sur mesure" déjà présent sur la page tarifs
  (`contact@mon-urba.fr`) est le point d'entrée existant pour ce segment.

### Cible tertiaire — communautés d'entraide travaux/bricolage
- Membres de groupes Facebook, forums (ex. forum-construire, communautés
  bricolage), qui posent déjà spontanément des questions de type "ai-je besoin
  d'un permis pour...". Cible à faible coût d'acquisition si l'approche reste
  utile et non commerciale en premier contact.

## 4. Messages clés

- **Message principal** : "Sachez en 5 minutes quelle autorisation
  d'urbanisme il vous faut, et ce qu'il faut fournir — sans décortiquer le PLU
  vous-même."
- **Message de réassurance** : "Nous nous appuyons sur les données officielles
  (cadastre, Géoportail de l'urbanisme, Géorisques) et la réglementation de
  votre commune."
- **Message de lancement (période promo)** : "Pour l'ouverture de MonUrba,
  l'analyse complète est à -50 % (19,50 € au lieu de 39 €) jusqu'au 1er
  janvier 2027."
- **Message de différenciation vs. généraliste** : contrairement à une
  recherche générique ou à un forum, l'analyse est personnalisée à l'adresse
  exacte du projet (parcelle, zone PLU, risques Géorisques).

## 5. Levier de lancement : la promotion -50%

La promotion en cours (Pack Étude à 19,50 € au lieu de 39 €, jusqu'au
01/01/2027 — voir la tâche Notion correspondante et son implémentation dans
`backend/src/modules/billing/packs.ts` / `frontend/src/lib/packs.ts`) est le
levier central de cette phase de communication :

- **Urgence légitime** : une vraie date de fin (1er janvier 2027) permet des
  relances "il reste X semaines" sans créer de fausse urgence.
- **Réduction du risque perçu** : à 19,50 €, l'essai devient un achat impulsif
  raisonnable pour un particulier qui hésite encore sur son projet.
- **Cohérence produit** : le prix barré + badge -50 % est déjà affiché sur la
  page d'accueil et sur la page de résultats d'analyse (`PricingPacks.tsx`,
  `LockedAnalysis.tsx`) — la communication externe doit reprendre exactement ces
  mêmes éléments visuels (prix barré, "-50 %", date de fin) pour que
  l'expérience soit cohérente du clic publicitaire jusqu'au paiement.
- **Rappel avant échéance** : prévoir une vague de communication de relance
  environ 3 semaines et 3 jours avant le 1er janvier 2027 ("dernières
  semaines de l'offre de lancement").

## 6. Canaux de communication

### SEO / contenu (canal prioritaire, déjà amorcé techniquement)
Le travail de SEO/GEO technique est déjà en place (données structurées,
métadonnées ciblées, `llms.txt`, pages FAQ/légales) : la priorité marketing
est de le nourrir en contenu pour capter la recherche informationnelle.
- Pages piliers par type de projet (une page dédiée "Déclaration préalable
  piscine", "Permis de construire extension", etc.) répondant aux questions
  les plus recherchées.
- Section FAQ existante à enrichir avec les questions réelles remontées par
  les premiers utilisateurs (formulaire de contact, échanges assistant Q&A).
- Articles de blog pratiques ("Piscine : DP ou PC selon la surface ?",
  "Comprendre le PLU de sa commune en 5 minutes") ciblant des requêtes longue
  traîne à faible concurrence.

### SEA / social ads
- Google Ads sur requêtes transactionnelles ("déclaration préalable en
  ligne", "permis de construire piscine délai") : budget test réduit, mesuré
  au coût par compte créé puis au coût par achat.
- Meta Ads (Facebook/Instagram) ciblant les intérêts "travaux/rénovation",
  "piscine", "bricolage" — format avant/après ou témoignage court, avec
  mention claire de la promo de lancement.

### Communautés et réseaux sociaux organiques
- Présence sur les groupes Facebook et forums travaux/bricolage cités en
  cible tertiaire : réponses utiles d'abord, mention du produit ensuite (règle
  90/10 pour ne pas être perçu comme spam commercial).
- Un compte LinkedIn pour toucher la cible professionnelle (architectes,
  agents immobiliers) avec du contenu sur l'évolution de la réglementation
  urbanisme.

### Relations presse locale / spécialisée
- Angle "startup française qui simplifie les démarches d'urbanisme" pour la
  presse économique régionale et les médias spécialisés habitat/travaux —
  pertinent au moment du lancement puis à chaque jalon (nombre de dossiers
  traités, ouverture du Pack Dossier).

## 7. Plan de contenu

Rythme réaliste pour une équipe réduite en phase de lancement : **2 contenus
SEO par mois** (pages piliers puis articles de blog) + **1 publication
réseaux sociaux par semaine** (organique, réutilisant/adaptant le contenu SEO)
+ **1 newsletter par mois** aux comptes créés (voir section email marketing).

Priorité des pages piliers (dans l'ordre, en fonction du volume de recherche
estimé et de la simplicité du sujet pour un premier contenu) :
1. Piscine (DP/PC selon surface et profondeur)
2. Extension de maison (DP/PC selon surface créée, zone PLU)
3. Abri de jardin / annexe
4. Clôture
5. Ravalement de façade

## 8. Partenariats et acquisition B2B2C

- **Pisciniers et constructeurs d'extensions locaux** : proposer un lien
  d'orientation (voire un code promo dédié) à intégrer dans leur propre devis
  ou site, en échange d'une commission ou d'un accès pro préférentiel une fois
  le Pack Dossier disponible.
- **Agents immobiliers / notaires** : argumentaire "vérifier la faisabilité
  d'un projet d'extension avant l'achat d'un bien" — utile en phase de
  négociation, à formaliser via l'offre professionnelle déjà mentionnée sur la
  page tarifs.
- **Mairies / intercommunalités** (à moyen terme, hors fenêtre de ce plan) :
  possibilité, une fois la couverture géographique consolidée, de proposer un
  lien vers MonUrba depuis les pages "urbanisme" des sites de mairies
  partenaires — démarche institutionnelle plus longue, à initier après les
  premiers retours utilisateurs.

## 9. Email marketing

L'envoi transactionnel (bienvenue + vérification de compte, confirmation
d'achat) est déjà en place via Brevo (`backend/src/modules/mail/mail.service.ts`).
Ce plan propose d'ajouter, **sans toucher au flux transactionnel existant**,
une séquence marketing distincte nécessitant un consentement explicite
(RGPD — pas d'ajout automatique des utilisateurs existants à une liste
marketing sans opt-in) :

- Un e-mail de bienvenue "marketing" optionnel (opt-in au moment de
  l'inscription ou dans les paramètres du compte) présentant les autres
  fonctionnalités (chat assistant, PDF récap téléchargeable).
- Une newsletter mensuelle : actualité réglementaire simplifiée, rappel de la
  promo en cours, mise en avant d'une question fréquente.
- Une relance ciblée aux comptes créés n'ayant pas encore acheté, rappelant la
  date de fin de la promotion à l'approche du 1er janvier 2027.

## 10. Calendrier (juillet 2026 → janvier 2027)

| Période | Focus |
|---|---|
| S1 (juil.-août 2026) | Mise en place SEO on-page (5 pages piliers), lancement des comptes réseaux sociaux, premier communiqué de lancement + presse locale |
| S2 (sept.-oct. 2026) | Démarrage SEA test (budget réduit), premiers partenariats pisciniers/artisans locaux, première newsletter |
| S3 (nov. 2026) | Bilan intermédiaire des canaux (coût par achat par canal), réallocation budget vers ce qui convertit |
| S4 (déc. 2026) | Vague de communication "derniers jours de la promo -50 %" (SEA, réseaux sociaux, email), au fur et à mesure de l'approche du 1er janvier 2027 |
| Après le 01/01/2027 | Transition de la communication vers l'argumentaire produit (sans la promo), premiers retours d'usage exploités en preuve sociale, préparation du lancement du Pack Dossier |

## 11. Budget indicatif

À affiner selon les moyens réels disponibles ; ordre de grandeur pour une
phase de lancement prudente, à ajuster canal par canal selon le coût par achat
mesuré (voir KPI) :

- **Contenu / SEO** : temps interne principalement (rédaction), pas de coût
  média direct.
- **SEA (Google + Meta)** : budget test mensuel modeste au démarrage, à
  n'augmenter qu'après validation d'un coût par achat acceptable au regard du
  prix promo (19,50 €) puis du prix plein (39 €).
- **Partenariats locaux** : coût principalement en temps de prospection et,
  le cas échéant, en commission par lead/vente plutôt qu'en budget fixe.
- **Relations presse** : pas de coût direct si approche en communiqué de
  presse gratuit auprès de la presse locale/spécialisée.

## 12. Indicateurs de succès (KPI)

- Trafic organique mensuel sur `mon-urba.fr` (Search Console).
- Taux de conversion visiteur → compte créé.
- Taux de conversion compte créé → achat Pack Étude.
- Coût par achat, par canal (SEA, social, organique).
- Taux d'ouverture / clic de la newsletter marketing.
- Nombre de partenaires actifs (pisciniers, artisans, pro) générant du trafic.
- À l'approche du 1er janvier 2027 : évolution du taux d'achat en réaction aux
  relances "fin de promo", pour évaluer l'effet réel de l'urgence sur la
  conversion.

## 13. Risques et points de vigilance

- **Sur-promesse réglementaire** : toute communication doit rester alignée
  avec l'avertissement légal du produit (outil d'aide à la décision, ce n'est
  pas une garantie d'obtention de l'autorisation). Un message publicitaire trop
  affirmatif ("obtenez votre permis") exposerait à un risque de confiance et,
  potentiellement, de non-conformité publicitaire.
- **Dépendance à la promotion** : une communication trop centrée sur le -50 %
  risque de fragiliser la perception de valeur une fois le prix plein
  rétabli — d'où l'importance de construire, en parallèle, des messages sur la
  valeur produit indépendants du prix (section 2 et 4).
- **Charge du canal communautaire** : les groupes/forums attendent une posture
  d'aide réelle ; une présence perçue comme trop commerciale peut nuire à la
  réputation de la marque plus vite qu'elle ne l'aide.
- **Capacité de traitement du support** : une hausse rapide du trafic doit
  être anticipée côté disponibilité de l'assistant Q&A et du contact
  professionnel (`contact@mon-urba.fr`), pour ne pas dégrader l'expérience des
  premiers utilisateurs acquis.
