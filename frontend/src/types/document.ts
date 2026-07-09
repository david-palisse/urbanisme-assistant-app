// Document types
export type DocumentRequirementLevel = 'obligatoire' | 'conditionnel' | 'optionnel';

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  cerfaNumber?: string;
  cerfaUrl?: string;
  mandatory: boolean;
  requirement: DocumentRequirementLevel;
  checked?: boolean;
}

export interface DocumentChecklist {
  category: string;
  documents: RequiredDocument[];
}
