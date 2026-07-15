import {
  DocumentRequirementLevel,
  MairieContact,
  ProjectDocuments,
  RequiredDocument,
} from '@/types';
import { request } from './http';

export const documentsApi = {
  async getDocuments(projectId: string): Promise<ProjectDocuments> {
    // Backend returns object { documents: [...], cerfa: {...}, ... }
    // We need to transform it to RequiredDocument[] format
    const response = await request<{
      documents: Array<{
        code: string;
        name: string;
        description: string;
        required: boolean;
        requirement?: DocumentRequirementLevel;
        cerfa?: string;
        helpUrl?: string;
      }>;
      cerfa?: {
        code: string;
        name: string;
        description: string;
        downloadUrl: string;
      };
      authorizationType?: string;
      message?: string;
      mairieContact?: MairieContact | null;
    }>(`/projects/${projectId}/documents`);

    const mairieContact = response.mairieContact ?? null;

    // If no documents (analysis not done yet), return empty array
    if (!response.documents || response.documents.length === 0) {
      // If there's a CERFA, add it as first document
      if (response.cerfa) {
        return {
          documents: [{
            id: response.cerfa.code,
            name: response.cerfa.name,
            description: response.cerfa.description,
            category: 'formulaires',
            cerfaNumber: response.cerfa.code,
            cerfaUrl: response.cerfa.downloadUrl,
            mandatory: true,
            requirement: 'obligatoire',
          }],
          mairieContact,
        };
      }
      return { documents: [], mairieContact };
    }

    const docs: RequiredDocument[] = [];

    // Add CERFA form as first document if present
    if (response.cerfa) {
      docs.push({
        id: response.cerfa.code,
        name: response.cerfa.name,
        description: response.cerfa.description,
        category: 'formulaires',
        cerfaNumber: response.cerfa.code,
        cerfaUrl: response.cerfa.downloadUrl,
        mandatory: true,
        requirement: 'obligatoire',
      });
    }

    // Transform backend documents to frontend format
    response.documents.forEach((doc) => {
      // Determine category based on code prefix
      let category = 'autres';
      if (
        doc.code.startsWith('ATTEST') ||
        /^PCMI1[34]/.test(doc.code) ||
        doc.name.toLowerCase().includes('attestation')
      ) {
        category = 'attestations';
      } else if (doc.name.toLowerCase().includes('notice')) {
        category = 'notices';
      } else if (doc.name.toLowerCase().includes('photo')) {
        category = 'photos';
      } else if (doc.code.includes('CERFA') || doc.code === 'DP1' || doc.code === 'PCMI1' || doc.code === 'PA1') {
        category = 'plans';
      } else if (doc.code.includes('2') || doc.code.includes('3') || doc.code.includes('4') || doc.code.includes('5')) {
        category = 'plans';
      } else if (doc.code.includes('6') || doc.code.includes('7') || doc.code.includes('8')) {
        category = 'photos';
      }

      docs.push({
        id: doc.code,
        name: doc.name,
        description: doc.description,
        category,
        cerfaNumber: doc.cerfa,
        cerfaUrl: doc.helpUrl,
        mandatory: doc.required,
        requirement: doc.requirement || (doc.required ? 'obligatoire' : 'conditionnel'),
      });
    });

    return { documents: docs, mairieContact };
  },
};
