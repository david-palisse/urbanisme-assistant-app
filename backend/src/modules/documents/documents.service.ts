import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationType, ProjectType } from '@prisma/client';
import { RequiredDocumentItem } from '../analysis/analysis.types';
import { applyAttestationRules } from '../analysis/rules/post-processing';
import { EntitlementService } from '../billing/entitlement.service';

export interface DocumentRequirement extends RequiredDocumentItem {
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
  constructor(
    private prisma: PrismaService,
    private entitlementService: EntitlementService,
  ) {}

  async getProjectDocuments(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { analysisResult: true, address: true },
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

    // The documents checklist and CERFA are part of the paid packs
    const unlocked = await this.entitlementService.isProjectUnlocked(projectId);
    if (!unlocked) {
      throw new ForbiddenException(
        'La liste des documents est réservée aux projets débloqués. Choisissez un pack pour y accéder.',
      );
    }

    const authType = project.analysisResult.authorizationType;
    const cerfa = this.getCerfaForProject(authType, project.projectType);
    const storedDocuments = project.analysisResult
      .requiredDocuments as unknown as DocumentRequirement[] | null;
    const baseDocuments =
      storedDocuments && storedDocuments.length > 0
        ? storedDocuments
        : this.getDefaultDocuments(authType);

    // Replay the deterministic attestation rules on the persisted documents
    // (idempotent thanks to the duplicate guards), so projects analyzed
    // before these rules existed get the attestations without a re-analysis.
    // Also normalizes the requirement level of documents persisted before
    // the tri-state existed.
    const retrofitted = applyAttestationRules(
      {
        authorizationType: authType,
        feasibilityStatus: 'compatible',
        summary: '',
        constraints: [],
        requiredDocuments: baseDocuments,
      },
      {
        projectType: project.projectType,
        naturalRisks: project.address
          ? {
              seismicZone: project.address.seismicZone,
              clayRisk: project.address.clayRisk,
            }
          : null,
        floodZone: project.address?.floodZone
          ? {
              isInFloodZone: true,
              zoneType: project.address.floodZone,
              riskLevel: project.address.floodZoneLevel,
              sourceName: project.address.floodZoneSource,
              description: null,
            }
          : null,
      },
    );

    return {
      authorizationType: authType,
      cerfa,
      documents: retrofitted.requiredDocuments as DocumentRequirement[],
      additionalInfo: this.getAdditionalInfo(authType),
    };
  }

  getCerfaForProject(
    authType: AuthorizationType,
    projectType: ProjectType,
  ): CerfaInfo | null {
    switch (authType) {
      case 'NONE':
        return null;
      case 'DP':
        return {
          code: 'CERFA 16702',
          name: 'Déclaration préalable — constructions et travaux non soumis à permis de construire',
          description:
            projectType === 'OTHER'
              ? 'Formulaire de déclaration préalable pour les constructions et travaux non soumis à permis de construire (remplace le CERFA 13703 depuis le 1er janvier 2025). Pour une division de terrain ou un aménagement (lotissement, aire de stationnement...), utilisez le CERFA 16703.'
              : 'Formulaire de déclaration préalable pour les constructions et travaux non soumis à permis de construire (remplace le CERFA 13703 depuis le 1er janvier 2025)',
          downloadUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R2028',
        };
      case 'PC':
        if (projectType === 'OTHER') {
          return {
            code: 'CERFA 13409*16',
            name: 'Demande de permis de construire (autre que maison individuelle)',
            description:
              'Formulaire de demande de permis de construire pour les constructions autres qu\'une maison individuelle et ses annexes',
            downloadUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R21378',
          };
        }
        return {
          code: 'CERFA 13406*16',
          name: 'Demande de permis de construire pour une maison individuelle et/ou ses annexes',
          description: 'Formulaire de demande de permis de construire pour maison individuelle',
          downloadUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R11637',
        };
      case 'PA':
        return {
          code: 'CERFA 13409*16',
          name: 'Demande de permis d\'aménager',
          description: 'Formulaire de demande de permis d\'aménager',
          downloadUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R21378',
        };
    }
  }

  getDefaultDocuments(authType: AuthorizationType): DocumentRequirement[] {
    const documents: Record<AuthorizationType, DocumentRequirement[]> = {
      NONE: [],
      // Bordereau des pièces du CERFA 16702: seule DP1 est exigée dans tous
      // les cas, les autres pièces dépendent de la nature/situation du projet.
      DP: [
        {
          code: 'DP1',
          name: 'Plan de situation du terrain',
          description: 'Plan permettant de situer le terrain dans la commune (échelle 1/5000 ou 1/25000)',
          requirement: 'obligatoire',
          required: true,
          helpUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F17578',
        },
        {
          code: 'DP2',
          name: 'Plan de masse',
          description: 'Requis si le projet crée une construction ou modifie le volume d\'une construction existante: plan coté représentant les constructions existantes et le projet (échelle 1/100 ou 1/500)',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP3',
          name: 'Plan en coupe du terrain et de la construction',
          description: 'Requis si le projet modifie le profil du terrain (déblais, remblais): coupe montrant l\'implantation du projet par rapport au terrain naturel',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP4',
          name: 'Plan des façades et des toitures',
          description: 'Requis si le projet crée ou modifie des façades ou des toitures: représentation des façades et toitures avec les ouvertures et matériaux',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP5',
          name: 'Représentation de l\'aspect extérieur de la construction',
          description: 'Requis si le projet modifie l\'aspect extérieur d\'une construction et que le plan des façades ne suffit pas à le montrer',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP6',
          name: 'Document graphique d\'insertion',
          description: 'Requis uniquement si le projet est visible depuis l\'espace public ou situé en secteur protégé: document permettant d\'apprécier l\'insertion du projet dans son environnement',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP7',
          name: 'Document photographique de l\'environnement proche',
          description: 'Requis uniquement si le projet est visible depuis l\'espace public ou situé en secteur protégé: photo(s) montrant le terrain et les constructions avoisinantes',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP8',
          name: 'Document photographique de l\'environnement lointain',
          description: 'Requis uniquement si le projet est visible depuis l\'espace public ou situé en secteur protégé: photo(s) de la rue, du paysage environnant',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'DP11',
          name: 'Notice décrivant le terrain et présentant le projet',
          description: 'Requis uniquement en secteur protégé (abords de monument historique, site patrimonial remarquable, site classé): notice décrivant le terrain, les matériaux et couleurs',
          requirement: 'conditionnel',
          required: false,
        },
      ],
      // Bordereau des pièces du CERFA 13406: PCMI1 à PCMI8 sont exigées dans
      // tous les cas; les attestations dépendent de la zone et du projet.
      PC: [
        {
          code: 'PCMI1',
          name: 'Plan de situation du terrain',
          description: 'Plan permettant de situer le terrain dans la commune',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI2',
          name: 'Plan de masse des constructions',
          description: 'Plan de masse à l\'échelle montrant les constructions existantes et projetées',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI3',
          name: 'Plan en coupe du terrain et de la construction',
          description: 'Coupe faisant apparaître l\'implantation du projet par rapport au profil du terrain',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI4',
          name: 'Notice descriptive',
          description: 'Description du terrain et présentation du projet avec matériaux et couleurs',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI5',
          name: 'Plan des façades et des toitures',
          description: 'Représentation des façades et toitures, avec dimensions et matériaux',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI6',
          name: 'Document graphique d\'insertion paysagère',
          description: 'Document graphique permettant d\'apprécier l\'insertion du projet dans l\'environnement',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI7',
          name: 'Photographie de l\'environnement proche',
          description: 'Photo situant le terrain dans son environnement proche',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI8',
          name: 'Photographie de l\'environnement lointain',
          description: 'Photo situant le terrain dans le paysage lointain',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PCMI13',
          name: 'Attestation de prise en compte des règles parasismiques',
          description: 'Requis si le projet est situé en zone sismique 2 à 5: attestation obligatoire depuis le 1er janvier 2024, à établir par un contrôleur technique ou un bureau d\'études',
          requirement: 'conditionnel',
          required: false,
        },
        {
          code: 'PCMI14-1',
          name: 'Attestation de prise en compte de la RE2020',
          description: 'Requis pour toute construction neuve soumise à la RE2020: attestation à établir via un bureau d\'études thermiques',
          requirement: 'conditionnel',
          required: false,
        },
      ],
      PA: [
        {
          code: 'PA1',
          name: 'Plan de situation',
          description: 'Plan de situation du terrain',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PA2',
          name: 'Notice du projet',
          description: 'Notice décrivant le projet d\'aménagement',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PA3',
          name: 'Plan de l\'état actuel',
          description: 'Plan de l\'état actuel du terrain à aménager',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PA4',
          name: 'Plan de composition d\'ensemble',
          description: 'Plan montrant les divisions et aménagements prévus',
          requirement: 'obligatoire',
          required: true,
        },
        {
          code: 'PA5',
          name: 'Profils en travers',
          description: 'Requis si des voies sont créées: profils en travers des voies à créer',
          requirement: 'conditionnel',
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
