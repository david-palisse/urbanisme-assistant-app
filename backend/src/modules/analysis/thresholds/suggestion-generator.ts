import { URBANISME_THRESHOLDS, ThresholdRule } from './urbanisme-thresholds';

export interface AdjustmentSuggestion {
  id: string;
  description: string;
  impactSurProjet: 'faible' | 'moyen' | 'important';
  targetField: string;
  currentValue: number;
  suggestedValue: number;
  thresholdValue: number;
  currentAuthorizationType: 'NONE' | 'DP' | 'PC';
  resultingAuthorizationType: 'NONE' | 'DP' | 'PC';
  category: 'surface' | 'height' | 'distance' | 'other';
  zoneContext?: string;
}

export interface SuggestionContext {
  projectType: string;
  questionnaireResponses: Record<string, any>;
  pluZone?: string;
  currentAuthorizationType: 'NONE' | 'DP' | 'PC' | 'PA';
  feasibilityStatus: string;
}

export function generateSuggestions(
  context: SuggestionContext,
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];
  const {
    projectType,
    questionnaireResponses,
    pluZone,
    currentAuthorizationType,
  } = context;

  // Get applicable thresholds for this project type
  const applicableThresholds = URBANISME_THRESHOLDS.filter(
    (rule) => rule.projectType === projectType,
  );

  for (const rule of applicableThresholds) {
    const currentValue = questionnaireResponses[rule.fieldId] as number;

    if (currentValue === undefined || currentValue === null) {
      continue;
    }

    // Find the applicable threshold based on zone
    const threshold = findApplicableThreshold(rule, pluZone);

    if (!threshold) continue;

    // Check if current value is above threshold and within suggestion range (20-25% above)
    if (currentValue > threshold.value) {
      const percentageAbove =
        ((currentValue - threshold.value) / threshold.value) * 100;

      // Only suggest if within reasonable adjustment range (≤25% above threshold)
      if (percentageAbove <= 25) {
        const suggestion = createSuggestion(
          rule,
          threshold,
          currentValue,
          currentAuthorizationType,
          pluZone,
        );
        suggestions.push(suggestion);
      }
    }
  }

  // Sort by impact (faible first) and limit to 3 suggestions
  return suggestions
    .sort((a, b) => impactOrder(a.impactSurProjet) - impactOrder(b.impactSurProjet))
    .slice(0, 3);
}

function findApplicableThreshold(
  rule: ThresholdRule,
  pluZone?: string,
): ThresholdRule['thresholds'][0] | undefined {
  // If rule has zone conditions, find the matching one
  if (rule.thresholds.some((t) => t.zoneCondition)) {
    const isUrbanZone = pluZone?.startsWith('U');

    for (const threshold of rule.thresholds) {
      if (threshold.zoneCondition === 'U*' && isUrbanZone) {
        return threshold;
      }
      if (threshold.zoneCondition === 'OTHER' && !isUrbanZone) {
        return threshold;
      }
    }
  }

  // Return the first threshold that would reduce authorization level
  return rule.thresholds[0];
}

function createSuggestion(
  rule: ThresholdRule,
  threshold: ThresholdRule['thresholds'][0],
  currentValue: number,
  currentAuth: string,
  pluZone?: string,
): AdjustmentSuggestion {
  const reduction = currentValue - threshold.value;
  const percentageReduction = (reduction / currentValue) * 100;

  // Determine impact based on percentage reduction needed
  let impact: 'faible' | 'moyen' | 'important';
  if (percentageReduction <= 10) {
    impact = 'faible';
  } else if (percentageReduction <= 20) {
    impact = 'moyen';
  } else {
    impact = 'important';
  }

  const authImprovement = getAuthorizationImprovement(
    threshold.authorizationAboveOrEqual,
    threshold.authorizationBelow,
  );

  return {
    id: `suggestion_${rule.fieldId}_${Date.now()}`,
    description: buildDescription(rule, threshold, currentValue, authImprovement),
    impactSurProjet: impact,
    targetField: rule.fieldId,
    currentValue,
    suggestedValue: threshold.value,
    thresholdValue: threshold.value,
    currentAuthorizationType: threshold.authorizationAboveOrEqual,
    resultingAuthorizationType: threshold.authorizationBelow,
    category: getCategoryFromField(rule.fieldId),
    zoneContext: pluZone,
  };
}

function buildDescription(
  rule: ThresholdRule,
  threshold: ThresholdRule['thresholds'][0],
  currentValue: number,
  authImprovement: string,
): string {
  const reduction = currentValue - threshold.value;

  if (rule.projectType === 'EXTENSION') {
    return `En réduisant votre extension de ${reduction.toFixed(1)} ${rule.unit} (de ${currentValue} à ${threshold.value} ${rule.unit}), ${authImprovement}`;
  }

  if (rule.projectType === 'POOL') {
    return `Une piscine de ${threshold.value} ${rule.unit} ou moins ${authImprovement.replace('vous passeriez', 'nécessiterait')}`;
  }

  if (rule.projectType === 'SHED') {
    return `En réduisant l'abri à ${threshold.value} ${rule.unit} ou moins, ${authImprovement}`;
  }

  if (rule.projectType === 'FENCE') {
    return `Une clôture de moins de ${threshold.value} ${rule.unit} de hauteur ${authImprovement.replace('vous passeriez', 'nécessiterait')}`;
  }

  return `En ajustant ${rule.fieldLabel} à ${threshold.value} ${rule.unit}, ${authImprovement}`;
}

function getAuthorizationImprovement(from: string, to: string): string {
  if (from === 'PC' && to === 'DP') {
    return "vous passeriez d'un Permis de Construire à une simple Déclaration Préalable";
  }
  if (from === 'DP' && to === 'NONE') {
    return "vous n'auriez besoin d'aucune autorisation";
  }
  if (from === 'PC' && to === 'NONE') {
    return "vous n'auriez besoin d'aucune autorisation";
  }
  return 'vous simplifieriez vos démarches administratives';
}

function getCategoryFromField(
  fieldId: string,
): 'surface' | 'height' | 'distance' | 'other' {
  if (fieldId.includes('surface') || fieldId.includes('emprise')) return 'surface';
  if (fieldId.includes('hauteur') || fieldId.includes('height')) return 'height';
  if (fieldId.includes('distance')) return 'distance';
  return 'other';
}

function impactOrder(impact: string): number {
  switch (impact) {
    case 'faible':
      return 1;
    case 'moyen':
      return 2;
    case 'important':
      return 3;
    default:
      return 4;
  }
}

// Export for use in analysis service
export function shouldGenerateSuggestions(
  authorizationType: string,
  feasibilityStatus: string,
): boolean {
  // Generate suggestions when:
  // 1. Project requires PC (could potentially be simplified to DP)
  // 2. Project has risks/constraints
  // 3. Project is not feasible
  return (
    authorizationType === 'PC' ||
    feasibilityStatus === 'compatible_a_risque' ||
    feasibilityStatus === 'probablement_incompatible'
  );
}
