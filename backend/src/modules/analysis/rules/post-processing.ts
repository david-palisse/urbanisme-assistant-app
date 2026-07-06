import { AnalysisInput, LLMAnalysisResult } from '../analysis.types';

/**
 * Deterministic post-processing applied on top of the LLM analysis result,
 * based on the regulatory data we fetched ourselves.
 */

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
        required: true,
      });
    }

    if (mergedResult.feasibilityStatus === 'compatible') {
      mergedResult.feasibilityStatus = 'compatible_a_risque';
    }
  }

  return mergedResult;
}
