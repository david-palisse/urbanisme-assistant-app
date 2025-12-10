import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationType } from '@prisma/client';

export interface DocumentRequirement {
  code: string;
  name: string;
  description: string;
  required: boolean;
  cerfa?: string;
  helpUrl?: string;
}

export interface CerfaInfo {
  code: string;
  name: string;
  description: string;
  downloadUrl: string;
}

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getProjectDocuments(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { analysisResult: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    if (!project.analysisResult) {
      return {
        message: 'Analysis not yet completed',
        documents: [],
        cerfa: null,
      };
    }

    const authType = project.analysisResult.authorizationType;
    const cerfa = this.getCerfaForAuthorizationType(authType);
    const documents = project.analysisResult.requiredDocuments as unknown as DocumentRequirement[];

    return {
      authorizationType: authType,
      cerfa,
      documents: documents || this.getDefaultDocuments(authType),
      additionalInfo: this.getAdditionalInfo(authType),
    };
  }

  getCerfaForAuthorizationType(authType: AuthorizationType): CerfaInfo | null {
    const cerfaMap: Record<AuthorizationType, CerfaInfo | null> = {
      NONE: null,
      DP: {
        code: 'CERFA 13703*08',
        name: 'Déclaration préalable pour une maison individuelle et/ou ses annexes',
        description: 'Formulaire de déclaration préalable pour les travaux sur maison individuelle',
        downloadUrl: 'https://www.service-public.fr/particuliers/vosdroits/R2028',
      },
      PC: {
        code: 'CERFA 13406*09',
        name: 'Demande de permis de construire pour une maison individuelle et/ou ses annexes',
        description: 'Formulaire de demande de permis de construire pour maison individuelle',
        downloadUrl: 'https://www.service-public.fr/particuliers/vosdroits/R11637',
      },
      PA: {
        code: 'CERFA 13409*09',
        name: 'Demande de permis d\'aménager',
        description: 'Formulaire de demande de permis d\'aménager',
        downloadUrl: 'https://www.service-public.fr/particuliers/vosdroits/R21378',
      },
    };

    return cerfaMap[authType];
  }

  getDefaultDocuments(authType: AuthorizationType): DocumentRequirement[] {
    const documents: Record<AuthorizationType, DocumentRequirement[]> = {
      NONE: [],
      DP: [
        {
          code: 'DP1',
          name: 'Plan de situation du terrain',
          description: 'Plan permettant de situer le terrain dans la commune (échelle 1/5000 ou 1/25000)',
          required: true,
          helpUrl: 'https://www.service-public.fr/particuliers/vosdroits/F17578',
        },
        {
          code: 'DP2',
          name: 'Plan de masse',
          description: 'Plan représentant les constructions existantes et le projet avec les cotes (échelle 1/100 ou 1/500)',
          required: true,
        },
        {
          code: 'DP3',
          name: 'Plan en coupe du terrain et de la construction',
          description: 'Coupe montrant l\'implantation du projet par rapport au terrain naturel et le profil du terrain',
          required: true,
        },
        {
          code: 'DP4',
          name: 'Plan des façades et des toitures',
          description: 'Représentation de toutes les façades et toitures avec les ouvertures et matériaux',
          required: true,
        },
        {
          code: 'DP5',
          name: 'Représentation de l\'aspect extérieur de la construction',
          description: 'Document graphique permettant d\'apprécier l\'insertion du projet dans son environnement',
          required: false,
        },
        {
          code: 'DP6',
          name: 'Document photographique du terrain et de son environnement proche',
          description: 'Photo(s) montrant le terrain et les constructions avoisinantes',
          required: true,
        },
        {
          code: 'DP7',
          name: 'Document photographique de l\'environnement lointain',
          description: 'Photo(s) de la rue, du paysage environnant',
          required: false,
        },
        {
          code: 'DP8',
          name: 'Plan de la parcelle cadastrale',
          description: 'Extrait du plan cadastral disponible sur cadastre.gouv.fr',
          required: false,
        },
      ],
      PC: [
        {
          code: 'PCMI1',
          name: 'Plan de situation du terrain',
          description: 'Plan permettant de situer le terrain dans la commune',
          required: true,
        },
        {
          code: 'PCMI2',
          name: 'Plan de masse des constructions',
          description: 'Plan de masse à l\'échelle montrant les constructions existantes et projetées',
          required: true,
        },
        {
          code: 'PCMI3',
          name: 'Plan en coupe du terrain et de la construction',
          description: 'Coupe faisant apparaître l\'implantation du projet par rapport au profil du terrain',
          required: true,
        },
        {
          code: 'PCMI4',
          name: 'Notice descriptive',
          description: 'Description du terrain et présentation du projet avec matériaux et couleurs',
          required: true,
        },
        {
          code: 'PCMI5',
          name: 'Plan des façades et des toitures',
          description: 'Représentation des façades et toitures, avec dimensions et matériaux',
          required: true,
        },
        {
          code: 'PCMI6',
          name: 'Document graphique d\'insertion paysagère',
          description: 'Document graphique permettant d\'apprécier l\'insertion du projet dans l\'environnement',
          required: true,
        },
        {
          code: 'PCMI7',
          name: 'Photographie de l\'environnement proche',
          description: 'Photo situant le terrain dans son environnement proche',
          required: true,
        },
        {
          code: 'PCMI8',
          name: 'Photographie de l\'environnement lointain',
          description: 'Photo situant le terrain dans le paysage lointain',
          required: true,
        },
        {
          code: 'PCMI9',
          name: 'Attestation de conformité RT2012/RE2020',
          description: 'Attestation de prise en compte de la réglementation thermique (si applicable)',
          required: false,
        },
      ],
      PA: [
        {
          code: 'PA1',
          name: 'Plan de situation',
          description: 'Plan de situation du terrain',
          required: true,
        },
        {
          code: 'PA2',
          name: 'Notice du projet',
          description: 'Notice décrivant le projet d\'aménagement',
          required: true,
        },
        {
          code: 'PA3',
          name: 'Plan de l\'état actuel',
          description: 'Plan de l\'état actuel du terrain à aménager',
          required: true,
        },
        {
          code: 'PA4',
          name: 'Plan de composition d\'ensemble',
          description: 'Plan montrant les divisions et aménagements prévus',
          required: true,
        },
        {
          code: 'PA5',
          name: 'Profils en travers',
          description: 'Profils en travers des voies à créer',
          required: false,
        },
      ],
    };

    return documents[authType] || [];
  }

  private getAdditionalInfo(authType: AuthorizationType): string[] {
    const info: Record<AuthorizationType, string[]> = {
      NONE: [
        'Aucune autorisation d\'urbanisme n\'est requise pour ce projet.',
        'Nous vous recommandons néanmoins de vérifier les règles de votre PLU.',
        'En cas de doute, consultez le service urbanisme de votre mairie.',
      ],
      DP: [
        'Le délai d\'instruction est généralement de 1 mois.',
        'Ce délai peut être porté à 2 mois si le projet est situé dans un secteur protégé (ABF).',
        'Le dossier doit être déposé en mairie en 2 exemplaires minimum.',
        'L\'affichage sur le terrain est obligatoire dès l\'obtention de la déclaration.',
      ],
      PC: [
        'Le délai d\'instruction est généralement de 2 mois pour une maison individuelle.',
        'Ce délai peut être porté à 3 mois si le projet est situé dans un secteur protégé.',
        'Le dossier doit être déposé en mairie en 4 exemplaires minimum.',
        'Le recours à un architecte est obligatoire si la surface de plancher dépasse 150 m².',
        'L\'affichage sur le terrain est obligatoire pendant toute la durée des travaux.',
      ],
      PA: [
        'Le délai d\'instruction est généralement de 3 mois.',
        'Le dossier doit être déposé en mairie.',
        'L\'avis de l\'architecte des Bâtiments de France peut être requis.',
      ],
    };

    return info[authType] || [];
  }
}
