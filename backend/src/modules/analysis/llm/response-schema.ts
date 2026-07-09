import { ENUM_VALIDATIONS } from './validation';

/**
 * Strict JSON schema for the analysis LLM response (OpenAI Structured
 * Outputs). Enforcing the enums at generation time removes the
 * enum-validation retry round-trips. Mirrors `LLMAnalysisResult` and
 * `ENUM_VALIDATIONS`.
 */
export const ANALYSIS_RESULT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    feasibilityStatus: { type: 'string', enum: ENUM_VALIDATIONS.feasibilityStatus },
    authorizationType: { type: 'string', enum: ENUM_VALIDATIONS.authorizationType },
    summary: { type: 'string' },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ENUM_VALIDATIONS['constraints.severity'] },
        },
        required: ['type', 'description', 'severity'],
      },
    },
    requiredDocuments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          requirement: { type: 'string', enum: ENUM_VALIDATIONS['requiredDocuments.requirement'] },
          required: { type: 'boolean' },
        },
        required: ['code', 'name', 'description', 'requirement', 'required'],
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          impactSurProjet: { type: 'string', enum: ENUM_VALIDATIONS['suggestions.impactSurProjet'] },
          targetField: { type: 'string' },
          currentValue: { type: 'number' },
          suggestedValue: { type: 'number' },
          thresholdValue: { type: 'number' },
          currentAuthorizationType: { type: 'string' },
          resultingAuthorizationType: { type: 'string' },
        },
        required: [
          'description',
          'impactSurProjet',
          'targetField',
          'currentValue',
          'suggestedValue',
          'thresholdValue',
          'currentAuthorizationType',
          'resultingAuthorizationType',
        ],
      },
    },
  },
  required: [
    'feasibilityStatus',
    'authorizationType',
    'summary',
    'constraints',
    'requiredDocuments',
    'suggestions',
  ],
} as const;
