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

// Contact de la mairie / du service urbanisme où déposer le dossier
export interface MairieContact {
  name: string;
  addressLines: string[];
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  annuaireUrl: string | null;
}

export interface ProjectDocuments {
  documents: RequiredDocument[];
  mairieContact: MairieContact | null;
}
