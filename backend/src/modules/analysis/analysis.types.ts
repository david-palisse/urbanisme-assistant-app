export interface AnalysisInput {
  projectType: string;
  projectName: string;
  questionnaireResponses: Record<string, unknown>;
  pluZone: string | null;
  pluZoneLabel: string | null;
  pluDocumentName: string | null;
  address: {
    city: string | null;
    postCode: string | null;
    parcelId: string | null;
  } | null;
  // Flood zone regulatory constraint
  floodZone: {
    isInFloodZone: boolean;
    zoneType: string | null; // rouge, bleu, etc.
    riskLevel: string | null; // fort, moyen, faible
    sourceName: string | null; // PPRI name
    description: string | null;
  } | null;
  // ABF (Architecte des Bâtiments de France) protection
  abfProtection: {
    isProtected: boolean;
    protectionType: string | null; // MH, SPR, AVAP, ZPPAUP
    perimeterDescription: string | null;
    monumentName: string | null;
  } | null;
  // Other natural risks
  naturalRisks: {
    seismicZone: string | null;
    clayRisk: string | null;
  } | null;
  // Noise exposure (PEB - Plan d'Exposition au Bruit)
  noiseExposure: {
    isInNoiseZone: boolean;
    zone: string | null; // Zone A, B, C, D (1, 2, 3, 4)
    airportName: string | null;
    airportCode: string | null;
    restrictions: string | null;
  } | null;
  pluExtractedRules: Record<string, unknown> | null; // Raw text of extracted PLU rules for context
}

// obligatoire: exigé dans tous les cas pour ce type d'autorisation
// conditionnel: exigé seulement dans certaines situations (condition en tête de description)
// optionnel: jamais exigé, simplement recommandé
export type DocumentRequirementLevel = 'obligatoire' | 'conditionnel' | 'optionnel';

export interface RequiredDocumentItem {
  code: string;
  name: string;
  description: string;
  required: boolean;
  requirement: DocumentRequirementLevel;
}

export interface LLMAnalysisResult {
  authorizationType: 'NONE' | 'DP' | 'PC' | 'PA';
  feasibilityStatus: 'compatible' | 'compatible_a_risque' | 'probablement_incompatible';
  summary: string;
  constraints: Array<{
    type: string;
    description: string;
    severity: 'faible' | 'moyenne' | 'elevee';
  }>;
  requiredDocuments: RequiredDocumentItem[];
  suggestions?: Array<{
    description: string;
    impactSurProjet: 'faible' | 'moyen' | 'important';
    targetField: string;
    currentValue: number;
    suggestedValue: number;
    thresholdValue: number;
    currentAuthorizationType: string;
    resultingAuthorizationType: string;
  }>;
}

// Validation errors interface for LLM retry mechanism
export interface ValidationError {
  field: string;
  receivedValue: unknown;
  expectedValues: string[];
  message: string;
}
