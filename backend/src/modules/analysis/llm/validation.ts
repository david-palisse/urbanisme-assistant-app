import { ValidationError } from '../analysis.types';

// Enum validation configuration
export const ENUM_VALIDATIONS: Record<string, string[]> = {
  authorizationType: ['NONE', 'DP', 'PC', 'PA'],
  feasibilityStatus: ['compatible', 'compatible_a_risque', 'probablement_incompatible'],
  'constraints.severity': ['faible', 'moyenne', 'elevee'],
  'requiredDocuments.requirement': ['obligatoire', 'conditionnel', 'optionnel'],
  'suggestions.impactSurProjet': ['faible', 'moyen', 'important'],
};

/**
 * Validate the LLM response against expected enum values
 * Returns an array of validation errors if any enum values are invalid
 */
export function validateLLMResponse(result: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate authorizationType
  if (result.authorizationType && !ENUM_VALIDATIONS.authorizationType.includes(result.authorizationType as string)) {
    errors.push({
      field: 'authorizationType',
      receivedValue: result.authorizationType,
      expectedValues: ENUM_VALIDATIONS.authorizationType,
      message: `Le champ "authorizationType" a une valeur invalide "${result.authorizationType}". Les valeurs possibles sont: ${ENUM_VALIDATIONS.authorizationType.join(', ')}`,
    });
  }

  // Validate feasibilityStatus
  if (result.feasibilityStatus && !ENUM_VALIDATIONS.feasibilityStatus.includes(result.feasibilityStatus as string)) {
    errors.push({
      field: 'feasibilityStatus',
      receivedValue: result.feasibilityStatus,
      expectedValues: ENUM_VALIDATIONS.feasibilityStatus,
      message: `Le champ "feasibilityStatus" a une valeur invalide "${result.feasibilityStatus}". Les valeurs possibles sont: ${ENUM_VALIDATIONS.feasibilityStatus.join(', ')}`,
    });
  }

  // Validate constraints severity
  const constraints = result.constraints as Array<{ severity?: string }> || [];
  constraints.forEach((constraint, index) => {
    if (constraint.severity && !ENUM_VALIDATIONS['constraints.severity'].includes(constraint.severity)) {
      errors.push({
        field: `constraints[${index}].severity`,
        receivedValue: constraint.severity,
        expectedValues: ENUM_VALIDATIONS['constraints.severity'],
        message: `Le champ "constraints[${index}].severity" a une valeur invalide "${constraint.severity}". Les valeurs possibles sont: ${ENUM_VALIDATIONS['constraints.severity'].join(', ')}`,
      });
    }
  });

  // Validate suggestions impactSurProjet
  const suggestions = result.suggestions as Array<{ impactSurProjet?: string }> || [];
  suggestions.forEach((suggestion, index) => {
    if (suggestion.impactSurProjet && !ENUM_VALIDATIONS['suggestions.impactSurProjet'].includes(suggestion.impactSurProjet)) {
      errors.push({
        field: `suggestions[${index}].impactSurProjet`,
        receivedValue: suggestion.impactSurProjet,
        expectedValues: ENUM_VALIDATIONS['suggestions.impactSurProjet'],
        message: `Le champ "suggestions[${index}].impactSurProjet" a une valeur invalide "${suggestion.impactSurProjet}". Les valeurs possibles sont: ${ENUM_VALIDATIONS['suggestions.impactSurProjet'].join(', ')}`,
      });
    }
  });

  return errors;
}
