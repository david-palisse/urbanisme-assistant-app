// Enums
export enum ProjectType {
  POOL = 'POOL',
  EXTENSION = 'EXTENSION',
  SHED = 'SHED',
  FENCE = 'FENCE',
  NEW_CONSTRUCTION = 'NEW_CONSTRUCTION',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  QUESTIONNAIRE = 'QUESTIONNAIRE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
}

export enum AuthorizationType {
  NONE = 'NONE',
  DP = 'DP',
  PC = 'PC',
  PA = 'PA',
}

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

// Address types
export interface Address {
  id: string;
  projectId: string;
  rawInput: string;
  lat: number;
  lon: number;
  inseeCode?: string;
  parcelId?: string;
  pluZone?: string;
  pluZoneLabel?: string;
  cityName?: string;
  postCode?: string;
  // Flood zone information
  floodZone?: string | null;
  floodZoneLevel?: string | null;
  floodZoneSource?: string | null;
  // ABF (Monument Historique) protection
  isAbfProtected?: boolean;
  abfType?: string | null;
  abfPerimeter?: string | null;
  abfMonumentName?: string | null;
  // Other risks
  seismicZone?: string | null;
  clayRisk?: string | null;
  createdAt: string;
  updatedAt: string;
}

// PLU Zone info type
export interface PluZoneInfo {
  zoneCode: string;
  zoneLabel: string;
  typezone: string;
  inseeCode: string;
  partition?: string;
}

// Noise Exposure (PEB - Plan d'Exposition au Bruit) info
export interface NoiseExposureInfo {
  isInNoiseZone: boolean;
  zone: string | null; // Zone A, B, C, D (PEB zones)
  airportName: string | null;
  airportCode: string | null;
  indiceLden: number | null; // Noise level day-evening-night
  indiceLn: number | null; // Noise level night
  approvalDate: string | null;
  documentRef: string | null;
  restrictions: string | null; // Description of construction restrictions
}

// Full location regulatory info response
export interface FullLocationInfo {
  pluZone: PluZoneInfo | null;
  pluZones: PluZoneInfo[]; // All PLU zones at this location (including prescriptions)
  floodZone: {
    isInFloodZone: boolean;
    zoneType: string | null;
    riskLevel: string | null;
    sourceName: string | null;
    description: string | null;
  };
  abfProtection: {
    isProtected: boolean;
    protectionType: string | null;
    perimeterDescription: string | null;
    monumentName: string | null;
    distance: number | null;
  };
  naturalRisks: {
    seismicZone: string | null;
    clayRisk: string | null;
  };
  noiseExposure: NoiseExposureInfo;
}

// Project types
export interface Project {
  id: string;
  userId: string;
  name: string;
  projectType: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  address?: Address;
  questionnaireResponse?: QuestionnaireResponse;
  analysisResult?: AnalysisResult;
}

export interface CreateProjectDto {
  name: string;
  projectType: ProjectType;
}

export interface UpdateProjectDto {
  name?: string;
  status?: ProjectStatus;
}

// Questionnaire types
export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface QuestionDependency {
  questionId: string;
  value: string | boolean | number;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'multiselect';
  options?: QuestionOption[];
  required: boolean;
  helpText?: string;
  unit?: string;
  validation?: QuestionValidation;
  dependsOn?: QuestionDependency;
}

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface QuestionnaireResponse {
  id: string;
  projectId: string;
  responses: Record<string, string | number | boolean | string[]>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveQuestionnaireDto {
  responses: Record<string, string | number | boolean | string[]>;
  completed?: boolean;
}

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

// Document types
export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  cerfaNumber?: string;
  cerfaUrl?: string;
  mandatory: boolean;
  checked?: boolean;
}

export interface DocumentChecklist {
  category: string;
  documents: RequiredDocument[];
}

// Geocoding types
export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
  city: string;
  postcode: string;
  citycode: string;
  context: string;
}

export interface ParcelInfo {
  parcelId: string;
  section: string;
  numero: string;
  commune: string;
  codeInsee: string;
}

export interface PluZone {
  zoneCode: string;
  zoneLabel?: string;
  typezone?: string;
}

// Auth types
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Parcel search result type
export interface ParcelSearchResult {
  address: string;
  city: string;
  postalCode: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  parcel: {
    id: string;
    section: string;
    number: string;
    commune: string;
    codeInsee: string;
  };
}

// Project type display info
export const projectTypeLabels: Record<ProjectType, string> = {
  [ProjectType.POOL]: 'Piscine',
  [ProjectType.EXTENSION]: 'Extension',
  [ProjectType.SHED]: 'Abri de jardin',
  [ProjectType.FENCE]: 'Clôture',
  [ProjectType.NEW_CONSTRUCTION]: 'Nouvelle construction',
};

export const projectTypeIcons: Record<ProjectType, string> = {
  [ProjectType.POOL]: '🏊',
  [ProjectType.EXTENSION]: '🏠',
  [ProjectType.SHED]: '🏚️',
  [ProjectType.FENCE]: '🚧',
  [ProjectType.NEW_CONSTRUCTION]: '🏠',
};

export const projectTypeDescriptions: Record<ProjectType, string> = {
  [ProjectType.POOL]: 'Piscine enterrée, semi-enterrée ou hors-sol',
  [ProjectType.EXTENSION]: 'Agrandissement, surélévation ou véranda',
  [ProjectType.SHED]: 'Abri de jardin, local technique ou annexe',
  [ProjectType.FENCE]: 'Clôture, portail ou mur de clôture',
  [ProjectType.NEW_CONSTRUCTION]: 'Construction d\'une maison individuelle ou d\'un bâtiment neuf',
};

export const statusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: 'Brouillon',
  [ProjectStatus.QUESTIONNAIRE]: 'Questionnaire en cours',
  [ProjectStatus.ANALYZING]: 'Analyse en cours',
  [ProjectStatus.COMPLETED]: 'Terminé',
};

export const statusColors: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [ProjectStatus.QUESTIONNAIRE]: 'bg-blue-100 text-blue-700',
  [ProjectStatus.ANALYZING]: 'bg-yellow-100 text-yellow-700',
  [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700',
};

export const authorizationTypeLabels: Record<AuthorizationType, string> = {
  [AuthorizationType.NONE]: 'Aucune autorisation requise',
  [AuthorizationType.DP]: 'Déclaration Préalable (DP)',
  [AuthorizationType.PC]: 'Permis de Construire (PC)',
  [AuthorizationType.PA]: "Permis d'Aménager (PA)",
};

export const authorizationTypeColors: Record<AuthorizationType, string> = {
  [AuthorizationType.NONE]: 'bg-green-100 text-green-700 border-green-200',
  [AuthorizationType.DP]: 'bg-orange-100 text-orange-700 border-orange-200',
  [AuthorizationType.PC]: 'bg-red-100 text-red-700 border-red-200',
  [AuthorizationType.PA]: 'bg-red-100 text-red-700 border-red-200',
};

export const documentCategoryLabels: Record<string, string> = {
  formulaires: 'Formulaires administratifs',
  plans: 'Plans et documents graphiques',
  photos: 'Photographies',
  notices: 'Notices descriptives',
  autres: 'Autres documents',
};
