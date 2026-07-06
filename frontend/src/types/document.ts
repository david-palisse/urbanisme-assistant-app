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
