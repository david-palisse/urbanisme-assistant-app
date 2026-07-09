import {
  AnalysisInput,
  DocumentRequirementLevel,
  LLMAnalysisResult,
  RequiredDocumentItem,
} from '../analysis.types';

/**
 * Deterministic post-processing applied on top of the LLM analysis result,
 * based on the regulatory data we fetched ourselves.
 */

const REQUIREMENT_LEVELS: DocumentRequirementLevel[] = ['obligatoire', 'conditionnel', 'optionnel'];

/**
 * Fill in a missing/invalid `requirement` (results persisted before the
 * tri-state existed only carry `required`) and keep `required` in sync.
 */
export function normalizeRequiredDocuments(
  documents: Array<Partial<RequiredDocumentItem>>,
): RequiredDocumentItem[] {
  return (documents || []).map((doc) => {
    const requirement = REQUIREMENT_LEVELS.includes(doc.requirement as DocumentRequirementLevel)
      ? (doc.requirement as DocumentRequirementLevel)
      : doc.required
        ? 'obligatoire'
        : 'conditionnel';

    return {
      ...doc,
      code: doc.code || '',
      name: doc.name || '',
      description: doc.description || '',
      requirement,
      required: requirement === 'obligatoire',
    };
  });
}

/**
 * Parse the free-form Géorisques seismic zone string ("3", "Zone 3",
 * "Zone de sismicité modérée (3)") into a zone number, or null if unknown.
 */
export function parseSeismicZone(seismicZone: string | null | undefined): number | null {
  if (!seismicZone) return null;
  const match = seismicZone.match(/[1-5]/);
  return match ? parseInt(match[0], 10) : null;
}

/** Subset of the analysis input needed by the attestation rules, so they can
 * also be replayed at read time from the persisted Address data. */
export type AttestationRuleInput = Pick<
  AnalysisInput,
  'projectType' | 'naturalRisks' | 'floodZone'
>;

/**
 * Deterministic regulatory attestations for permis de construire. Idempotent
 * thanks to the duplicate guards, so it runs both at analysis time and when
 * serving the documents of projects analyzed before these rules existed.
 */
export function applyAttestationRules(
  result: LLMAnalysisResult,
  input: AttestationRuleInput,
): LLMAnalysisResult {
  const mergedResult: LLMAnalysisResult = {
    ...result,
    constraints: [...(result.constraints || [])],
    requiredDocuments: normalizeRequiredDocuments(result.requiredDocuments || []),
    summary: result.summary || '',
  };

  if (result.authorizationType !== 'PC') {
    return mergedResult;
  }

  const documents = mergedResult.requiredDocuments;
  const hasDocument = (pattern: RegExp) =>
    documents.some(
      (doc) => pattern.test(doc.code.toLowerCase()) || pattern.test(doc.name.toLowerCase()),
    );

  // Attestation parasismique (PCMI13): obligatoire depuis le 1er janvier 2024
  // pour les permis de construire en zone sismique 2 à 5.
  const seismicZone = parseSeismicZone(input.naturalRisks?.seismicZone);
  if (seismicZone !== null && seismicZone >= 2 && !hasDocument(/pcmi13|sismique/)) {
    documents.push({
      code: 'PCMI13',
      name: 'Attestation de prise en compte des règles parasismiques',
      description: `Obligatoire depuis le 1er janvier 2024 pour les permis de construire en zone sismique 2 à 5 (zone détectée: ${seismicZone}). À établir par un contrôleur technique ou un bureau d'études.`,
      requirement: 'obligatoire',
      required: true,
    });
  }

  // Attestation RE2020 (PCMI14-1): obligatoire au dépôt du permis pour toute
  // construction neuve soumise à la RE2020.
  if (!hasDocument(/pcmi14|re2020|rt2012/)) {
    if (input.projectType === 'NEW_CONSTRUCTION') {
      documents.push({
        code: 'PCMI14-1',
        name: 'Attestation de prise en compte de la RE2020',
        description:
          'Attestation de prise en compte de la réglementation environnementale RE2020, obligatoire au dépôt du permis de construire pour toute construction neuve. À établir via un bureau d\'études thermiques.',
        requirement: 'obligatoire',
        required: true,
      });
    } else if (input.projectType === 'EXTENSION') {
      documents.push({
        code: 'PCMI14-1',
        name: 'Attestation de prise en compte de la RE2020',
        description:
          'Requis uniquement si l\'extension dépasse les seuils de surface de la RE2020: attestation de prise en compte de la réglementation environnementale, à établir via un bureau d\'études thermiques.',
        requirement: 'conditionnel',
        required: false,
      });
    }
  }

  // Attestation PPR: le règlement d'un Plan de Prévention des Risques peut
  // subordonner le projet à une étude préalable (article R431-16 du code de
  // l'urbanisme).
  if (input.floodZone?.isInFloodZone && input.floodZone.sourceName && !hasDocument(/ppr/)) {
    documents.push({
      code: 'ATTEST_PPR',
      name: 'Attestation de prise en compte du Plan de Prévention des Risques',
      description: `Requis uniquement si le règlement du PPR (${input.floodZone.sourceName}) subordonne le projet à une étude préalable: attestation de l'architecte ou d'un expert certifiant la réalisation de cette étude.`,
      requirement: 'conditionnel',
      required: false,
    });
  }

  return mergedResult;
}

export function applyPluRulesToResult(
  result: LLMAnalysisResult,
  input: AnalysisInput,
): LLMAnalysisResult {
  if (!input.pluExtractedRules) return result;

  const mergedResult: LLMAnalysisResult = {
    ...result,
    constraints: [...(result.constraints || [])],
    requiredDocuments: [...(result.requiredDocuments || [])],
    summary: result.summary || '',
  };
  return mergedResult;
}

export function applyNoiseExposureRules(
  result: LLMAnalysisResult,
  input: AnalysisInput,
): LLMAnalysisResult {
  if (!input.noiseExposure?.isInNoiseZone || !input.noiseExposure.zone) {
    return result;
  }

  const mergedResult: LLMAnalysisResult = {
    ...result,
    constraints: [...(result.constraints || [])],
    requiredDocuments: [...(result.requiredDocuments || [])],
    summary: result.summary || '',
  };

  const zone = input.noiseExposure.zone.toUpperCase();
  const existingNoiseConstraint = mergedResult.constraints.some((constraint) =>
    constraint.type.toLowerCase().includes('bruit') ||
    constraint.type.toLowerCase().includes('peb')
  );

  if (!existingNoiseConstraint) {
    const description = input.noiseExposure.restrictions || `Zone ${zone} du PEB.`;
    let severity: 'faible' | 'moyenne' | 'elevee' = 'faible';

    if (zone === 'A') severity = 'elevee';
    if (zone === 'B') severity = 'moyenne';
    if (zone === 'C') severity = 'moyenne';

    mergedResult.constraints.push({
      type: 'Bruit aérien (PEB)',
      description,
      severity,
    });
  }

  if (zone === 'D') {
    const existingAttestation = mergedResult.requiredDocuments.some((doc) =>
      doc.code.toLowerCase().includes('acoustique') ||
      doc.name.toLowerCase().includes('acoustique')
    );

    if (!existingAttestation) {
      mergedResult.requiredDocuments.push({
        code: 'ATTEST_ACOUSTIQUE',
        name: 'Attestation acoustique PEB',
        description: 'Attestation de prise en compte de la réglementation acoustique en zone D du PEB.',
        requirement: 'obligatoire',
        required: true,
      });
    }

    if (mergedResult.feasibilityStatus === 'compatible') {
      mergedResult.feasibilityStatus = 'compatible_a_risque';
    }
  }

  return mergedResult;
}
