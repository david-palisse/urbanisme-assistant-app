import { AuthorizationType } from './enums';
import { RequiredDocument } from './document';

// Analysis types
export interface Constraint {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AdjustmentSuggestion {
  description: string;
  impactSurProjet: 'faible' | 'moyen' | 'important';
  targetField: string;
  currentValue: number;
  suggestedValue: number;
  thresholdValue: number;
  currentAuthorizationType: string;
  resultingAuthorizationType: string;
}

export interface AnalysisResult {
  id: string;
  projectId: string;
  authorizationType: AuthorizationType;
  constraints: Constraint[];
  requiredDocuments: RequiredDocument[];
  llmResponse?: string;
  feasibilityStatus?: 'compatible' | 'compatible_a_risque' | 'probablement_incompatible';
  summary?: string;
  suggestions?: AdjustmentSuggestion[];
  createdAt: string;
  updatedAt?: string;
}
