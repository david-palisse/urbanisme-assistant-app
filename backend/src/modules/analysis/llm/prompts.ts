import { AnalysisInput, ValidationError } from '../analysis.types';

export const ANALYSIS_SYSTEM_PROMPT = `Tu es un instructeur du droit du sol expert en urbanisme français. Tu analyses des règlements et les projets de construction des utilisateurs et à partir de ceux-ci tu détermines:
1. La faisabilité du projet selon les règles d'urbanisme ET les contraintes réglementaires (zones inondables, protection des monuments historiques, etc.)
2. Le type d'autorisation nécessaire (aucune, Déclaration Préalable DP, Permis de Construire PC, Permis d'Aménager PA)
3. Les contraintes et risques potentiels - PARTICULIÈREMENT IMPORTANT: les zones inondables rouges et la protection ABF peuvent rendre un projet IMPOSSIBLE
4. La liste des documents requis pour constituer le dossier
5. Des SUGGESTIONS D'AJUSTEMENT si des modifications mineures peuvent simplifier les démarches

RÈGLES DE PRIORITÉ (IMPORTANT):
- Les règles PLU extraites qui te sont fournies couvrent TOUTE la zone, indépendamment du type de projet: des règles générales par catégorie, et un tableau "exceptions" listant les dérogations propres à certains types de projets ou de constructions (piscine, extension, annexe, clôture...).
- C'est à TOI de sélectionner et d'appliquer les règles pertinentes pour le type de projet analysé: quand une règle générale (ex: recul aux limites séparatives 6m) coexiste avec une exception applicable au type de projet (ex: piscine 3m), tu dois TOUJOURS appliquer et expliquer l'exception.
- Ne présente pas la règle générale comme applicable si une exception explicite existe pour le projet analysé.
- Ignore les exceptions qui concernent d'autres types de projets que celui analysé.

=== SUGGESTIONS D'AJUSTEMENT ===
Si le projet nécessite un Permis de Construire (PC) ou présente des contraintes, analyse si de petits ajustements pourraient simplifier les démarches.

Règles de suggestion:
1. Suggérer UNIQUEMENT si la valeur actuelle dépasse le seuil de 25% ou moins
2. Limiter à maximum 3 suggestions
3. Prioriser par impact (faible → moyen → important)

Exemples de suggestions:
- Extension 45m² en zone U: "En réduisant votre extension de 5 m² (de 45 à 40 m²), vous passeriez d'un Permis de Construire à une simple Déclaration Préalable"
- Piscine 105m²: "Une piscine de 100 m² ou moins nécessiterait seulement une Déclaration Préalable"

Tu dois répondre UNIQUEMENT en JSON valide selon le schéma suivant:
{
  "feasibilityStatus": "compatible" | "compatible_a_risque" | "probablement_incompatible",
  "authorizationType": "NONE" | "DP" | "PC" | "PA",
  "summary": "Résumé de l'analyse en 2-3 phrases INCLUANT les contraintes réglementaires",
  "constraints": [
    {
      "type": "Type de contrainte",
      "description": "Description détaillée",
      "severity": "faible" | "moyenne" | "elevee"
    }
  ],
  "requiredDocuments": [
    {
      "code": "Code du document (ex: PCMI1, DP1)",
      "name": "Nom du document",
      "description": "Description et exigences",
      "required": true | false
    }
  ],
  "suggestions": [
    {
      "description": "Description de la suggestion d'ajustement",
      "impactSurProjet": "faible" | "moyen" | "important",
      "targetField": "Champ concerné (ex: extension_surface_plancher)",
      "currentValue": 45,
      "suggestedValue": 40,
      "thresholdValue": 40,
      "currentAuthorizationType": "PC",
      "resultingAuthorizationType": "DP"
    }
  ]
}`;

/**
 * Build the user prompt describing the project and its regulatory context
 */
export function buildAnalysisUserPrompt(input: AnalysisInput): string {
  // Build flood zone section for prompt
  let floodZoneInfo = 'Non vérifiée';
  if (input.floodZone) {
    if (input.floodZone.isInFloodZone) {
      floodZoneInfo = `⚠️ ZONE INONDABLE DÉTECTÉE - Type: ${input.floodZone.zoneType || 'Non précisé'}, Niveau de risque: ${input.floodZone.riskLevel || 'Non précisé'}`;
      if (input.floodZone.sourceName) {
        floodZoneInfo += ` (Source: ${input.floodZone.sourceName})`;
      }
      if (input.floodZone.description) {
        floodZoneInfo += `. ${input.floodZone.description}`;
      }
    } else {
      floodZoneInfo = 'Hors zone inondable';
    }
  }

  // Build ABF protection section for prompt
  let abfInfo = 'Non vérifiée';
  if (input.abfProtection) {
    if (input.abfProtection.isProtected) {
      abfInfo = `⚠️ PÉRIMÈTRE PROTÉGÉ ABF - Type: ${input.abfProtection.protectionType || 'Monument Historique'}`;
      if (input.abfProtection.monumentName) {
        abfInfo += ` (${input.abfProtection.monumentName})`;
      }
      if (input.abfProtection.perimeterDescription) {
        abfInfo += `. ${input.abfProtection.perimeterDescription}`;
      }
      abfInfo += '. Avis ABF obligatoire, délais allongés, contraintes architecturales strictes.';
    } else {
      abfInfo = 'Hors périmètre protégé';
    }
  }

  // Build natural risks section
  let naturalRisksInfo = '';
  if (input.naturalRisks) {
    const risks = [];
    if (input.naturalRisks.seismicZone) {
      risks.push(`Zone sismique: ${input.naturalRisks.seismicZone}`);
    }
    if (input.naturalRisks.clayRisk) {
      risks.push(`Risque argile: ${input.naturalRisks.clayRisk}`);
    }
    naturalRisksInfo = risks.length > 0 ? risks.join(', ') : 'Aucun risque naturel majeur identifié';
  }

  // Build noise exposure (PEB) section
  let noiseExposureInfo = 'Non vérifiée';
  if (input.noiseExposure) {
    if (input.noiseExposure.isInNoiseZone) {
      noiseExposureInfo = `⚠️ ZONE DE BRUIT AÉROPORT (PEB) - Zone ${input.noiseExposure.zone || 'non précisée'}`;
      if (input.noiseExposure.airportName) {
        noiseExposureInfo += ` - Aéroport de ${input.noiseExposure.airportName}`;
        if (input.noiseExposure.airportCode) {
          noiseExposureInfo += ` (${input.noiseExposure.airportCode})`;
        }
      }
      if (input.noiseExposure.restrictions) {
        noiseExposureInfo += `. ${input.noiseExposure.restrictions}`;
      }
    } else {
      noiseExposureInfo = 'Hors zone de bruit aéroport';
    }
  }

  return `Analyse ce projet de construction:

Type de projet: ${input.projectType}
Nom du projet: ${input.projectName}
Zone PLU: ${input.pluZone || 'Non déterminée'}${input.pluZoneLabel ? ` (${input.pluZoneLabel})` : ''}
Document PLU: ${input.pluDocumentName || 'Non déterminé'}

Règles PLU locales de la zone (ruleset complet, indépendant du type de projet — sélectionne celles qui s'appliquent au projet de type ${input.projectType}, en donnant la priorité aux entrées du tableau "exceptions" qui le concernent) : ${input.pluExtractedRules ? JSON.stringify(input.pluExtractedRules, null, 2) : 'Non disponibles'}

Localisation: ${input.address ? `${input.address.city} (${input.address.postCode})` : 'Non renseignée'}

=== CONTRAINTES RÉGLEMENTAIRES MAJEURES ===
Zone inondable (PPRI): ${floodZoneInfo}
Protection patrimoniale (ABF): ${abfInfo}
Zone de bruit aéroport (PEB): ${noiseExposureInfo}
Autres risques naturels: ${naturalRisksInfo}
==========================================

Réponses au questionnaire:
${JSON.stringify(input.questionnaireResponses, null, 2)}

IMPORTANT: Prends en compte les contraintes réglementaires normales (et les majeures ci-dessus) pour déterminer la faisabilité du projet. Ex: Si le terrain est en zone inondable rouge, le projet est généralement interdit, ou si le projet contient une piscine à 2m de distance séparative au lieu des 3 légaux, projet aussi probablement incompatible.

Détermine le type d'autorisation nécessaire et génère l'analyse complète.`;
}

/**
 * Build a correction prompt for the LLM when validation errors are found
 */
export function buildCorrectionPrompt(originalResponse: string, errors: ValidationError[]): string {
  let prompt = `Ton JSON précédent contient des erreurs de valeurs enum. Voici le JSON que tu as retourné:

\`\`\`json
${originalResponse}
\`\`\`

**ERREURS DE VALIDATION DÉTECTÉES:**
`;

  errors.forEach((error, index) => {
    prompt += `
${index + 1}. **${error.field}**: Tu as utilisé "${error.receivedValue}"
   - Valeurs autorisées: ${error.expectedValues.map(v => `"${v}"`).join(' | ')}
   - ${error.message}`;
  });

  prompt += `

**CORRIGE le JSON ci-dessus en utilisant UNIQUEMENT les valeurs enum autorisées.**

Rappel des valeurs possibles:
- authorizationType: "NONE" | "DP" | "PC" | "PA"
- feasibilityStatus: "compatible" | "compatible_a_risque" | "probablement_incompatible"
- constraints.severity: "faible" | "moyenne" | "elevee"
- suggestions.impactSurProjet: "faible" | "moyen" | "important"

Retourne UNIQUEMENT le JSON corrigé, sans explication.`;

  return prompt;
}
