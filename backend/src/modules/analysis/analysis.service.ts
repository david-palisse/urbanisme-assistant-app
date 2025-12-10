import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { UrbanismeService } from '../urbanisme/urbanisme.service';
import { AuthorizationType, ProjectStatus } from '@prisma/client';

interface AnalysisInput {
  projectType: string;
  projectName: string;
  questionnaireResponses: Record<string, unknown>;
  pluZone: string | null;
  address: {
    city: string | null;
    postCode: string | null;
    parcelId: string | null;
  } | null;
}

interface LLMAnalysisResult {
  authorizationType: 'NONE' | 'DP' | 'PC' | 'PA';
  feasibilityStatus: 'compatible' | 'compatible_a_risque' | 'probablement_incompatible';
  summary: string;
  constraints: Array<{
    type: string;
    description: string;
    severity: 'faible' | 'moyenne' | 'elevee';
  }>;
  requiredDocuments: Array<{
    code: string;
    name: string;
    description: string;
    required: boolean;
  }>;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private urbanismeService: UrbanismeService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async analyzeProject(userId: string, projectId: string) {
    // Get project with all related data
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        address: true,
        questionnaireResponse: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    if (!project.questionnaireResponse) {
      throw new BadRequestException('Questionnaire must be completed before analysis');
    }

    // Update project status
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ANALYZING },
    });

    try {
      // Get PLU zone if not already set
      let pluZone = project.address?.pluZone;
      if (!pluZone && project.address) {
        const zoneInfo = await this.urbanismeService.getPluZoneByCoordinates(
          project.address.lat,
          project.address.lon,
        );
        if (zoneInfo) {
          pluZone = zoneInfo.zoneCode;
          await this.prisma.address.update({
            where: { projectId },
            data: { pluZone: zoneInfo.zoneCode },
          });
        }
      }

      // Prepare analysis input
      const analysisInput: AnalysisInput = {
        projectType: project.projectType,
        projectName: project.name,
        questionnaireResponses: project.questionnaireResponse.responses as Record<string, unknown>,
        pluZone: pluZone ?? null,
        address: project.address
          ? {
              city: project.address.cityName,
              postCode: project.address.postCode,
              parcelId: project.address.parcelId,
            }
          : null,
      };

      // Perform LLM analysis
      const analysisResult = await this.performLLMAnalysis(analysisInput);

      // Save analysis result
      const savedResult = await this.prisma.analysisResult.upsert({
        where: { projectId },
        create: {
          projectId,
          authorizationType: AuthorizationType[analysisResult.authorizationType],
          constraints: analysisResult.constraints,
          requiredDocuments: analysisResult.requiredDocuments,
          feasibilityStatus: analysisResult.feasibilityStatus,
          summary: analysisResult.summary,
          llmResponse: JSON.stringify(analysisResult),
        },
        update: {
          authorizationType: AuthorizationType[analysisResult.authorizationType],
          constraints: analysisResult.constraints,
          requiredDocuments: analysisResult.requiredDocuments,
          feasibilityStatus: analysisResult.feasibilityStatus,
          summary: analysisResult.summary,
          llmResponse: JSON.stringify(analysisResult),
        },
      });

      // Update project status
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.COMPLETED },
      });

      return savedResult;
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`);

      // Reset project status
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.QUESTIONNAIRE },
      });

      throw new BadRequestException(`Analysis failed: ${error.message}`);
    }
  }

  async getAnalysisResult(userId: string, projectId: string) {
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

    return project.analysisResult;
  }

  private async performLLMAnalysis(input: AnalysisInput): Promise<LLMAnalysisResult> {
    if (!this.openai) {
      // Return mock analysis if OpenAI is not configured
      return this.getMockAnalysis(input);
    }

    const model = this.configService.get<string>('openai.model') || 'gpt-4o';

    const systemPrompt = `Tu es un assistant expert en urbanisme français. Tu analyses des projets de construction et tu détermines:
1. Le type d'autorisation nécessaire (aucune, Déclaration Préalable DP, Permis de Construire PC, Permis d'Aménager PA)
2. La faisabilité du projet selon les règles d'urbanisme
3. Les contraintes et risques potentiels
4. La liste des documents requis pour constituer le dossier

Tu dois répondre UNIQUEMENT en JSON valide selon le schéma suivant:
{
  "authorizationType": "NONE" | "DP" | "PC" | "PA",
  "feasibilityStatus": "compatible" | "compatible_a_risque" | "probablement_incompatible",
  "summary": "Résumé de l'analyse en 2-3 phrases",
  "constraints": [
    {
      "type": "Type de contrainte",
      "description": "Description détaillée",
      "severity": "faible" | "moyenne" | "elevee"
    }
  ],
  "requiredDocuments": [
    {
      "code": "Code du document (ex: PCMI1, DP1)",
      "name": "Nom du document",
      "description": "Description et exigences",
      "required": true | false
    }
  ]
}`;

    const userPrompt = `Analyse ce projet de construction:

Type de projet: ${input.projectType}
Nom du projet: ${input.projectName}
Zone PLU: ${input.pluZone || 'Non déterminée'}
Localisation: ${input.address ? `${input.address.city} (${input.address.postCode})` : 'Non renseignée'}

Réponses au questionnaire:
${JSON.stringify(input.questionnaireResponses, null, 2)}

Détermine le type d'autorisation nécessaire et génère l'analyse complète.`;

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const result = JSON.parse(content) as LLMAnalysisResult;

      // Validate required fields
      if (!result.authorizationType || !result.feasibilityStatus) {
        throw new Error('Invalid LLM response structure');
      }

      return result;
    } catch (error) {
      this.logger.error(`LLM analysis error: ${error.message}`);
      // Fall back to mock analysis
      return this.getMockAnalysis(input);
    }
  }

  private getMockAnalysis(input: AnalysisInput): LLMAnalysisResult {
    // Determine authorization type based on project type and responses
    const responses = input.questionnaireResponses;
    let authorizationType: 'NONE' | 'DP' | 'PC' | 'PA' = 'DP';
    let feasibilityStatus: 'compatible' | 'compatible_a_risque' | 'probablement_incompatible' = 'compatible';

    // Simple rules based on project type
    switch (input.projectType) {
      case 'POOL':
        const poolSurface = (responses.piscine_surface as number) || 0;
        const poolAbri = responses.piscine_abri as string;

        if (poolSurface <= 10 && poolAbri === 'aucun') {
          authorizationType = 'NONE';
        } else if (poolSurface <= 100 && (!poolAbri || poolAbri === 'aucun' || poolAbri === 'couverture_basse')) {
          authorizationType = 'DP';
        } else {
          authorizationType = 'PC';
        }
        break;

      case 'EXTENSION':
        const extensionSurface = (responses.extension_surface_plancher as number) || 0;
        const inPluZone = responses.zone_plu as boolean;
        const threshold = inPluZone ? 40 : 20;

        if (extensionSurface <= threshold) {
          authorizationType = 'DP';
        } else {
          authorizationType = 'PC';
        }
        break;

      case 'SHED':
        const shedSurface = (responses.abri_surface as number) || 0;

        if (shedSurface <= 5) {
          authorizationType = 'NONE';
        } else if (shedSurface <= 20) {
          authorizationType = 'DP';
        } else {
          authorizationType = 'PC';
        }
        break;

      case 'FENCE':
        const fenceHeight = (responses.cloture_hauteur as number) || 0;

        if (fenceHeight < 2) {
          authorizationType = 'DP';
        } else {
          authorizationType = 'PC';
        }
        break;
    }

    // Check setback distances for risk assessment
    const distanceLimite = (responses.distance_limite_separative as number) || 999;
    if (distanceLimite < 3) {
      feasibilityStatus = 'compatible_a_risque';
    }

    return {
      authorizationType,
      feasibilityStatus,
      summary: this.generateSummary(input.projectType, authorizationType, feasibilityStatus),
      constraints: this.generateConstraints(input, distanceLimite),
      requiredDocuments: this.getRequiredDocuments(authorizationType, input.projectType),
    };
  }

  private generateSummary(
    projectType: string,
    authType: string,
    feasibility: string,
  ): string {
    const projectNames: Record<string, string> = {
      POOL: 'piscine',
      EXTENSION: 'extension',
      SHED: 'abri de jardin',
      FENCE: 'clôture',
    };

    const authNames: Record<string, string> = {
      NONE: 'aucune autorisation',
      DP: 'une Déclaration Préalable (DP)',
      PC: 'un Permis de Construire (PC)',
      PA: 'un Permis d\'Aménager (PA)',
    };

    const name = projectNames[projectType] || 'projet';
    const auth = authNames[authType] || authType;

    let summary = `Votre projet de ${name} nécessite ${auth}. `;

    if (feasibility === 'compatible') {
      summary += 'Le projet semble conforme aux règles d\'urbanisme applicables.';
    } else if (feasibility === 'compatible_a_risque') {
      summary += 'Le projet présente certains points d\'attention qui pourraient nécessiter des ajustements.';
    } else {
      summary += 'Le projet présente des incompatibilités potentielles avec la réglementation en vigueur.';
    }

    return summary;
  }

  private generateConstraints(
    input: AnalysisInput,
    distanceLimite: number,
  ): LLMAnalysisResult['constraints'] {
    const constraints: LLMAnalysisResult['constraints'] = [];

    if (distanceLimite < 3) {
      constraints.push({
        type: 'Recul limite séparative',
        description: `La distance à la limite séparative (${distanceLimite}m) est inférieure au minimum généralement requis (3m).`,
        severity: distanceLimite < 1 ? 'elevee' : 'moyenne',
      });
    }

    if (!input.pluZone) {
      constraints.push({
        type: 'Zone PLU non identifiée',
        description: 'La zone PLU n\'a pas pu être identifiée. Les règles spécifiques à votre parcelle n\'ont pas été vérifiées.',
        severity: 'moyenne',
      });
    }

    return constraints;
  }

  private getRequiredDocuments(
    authType: string,
    projectType: string,
  ): LLMAnalysisResult['requiredDocuments'] {
    const baseDocuments = {
      DP: [
        { code: 'DP1', name: 'Plan de situation', description: 'Plan permettant de situer le terrain dans la commune', required: true },
        { code: 'DP2', name: 'Plan de masse', description: 'Plan représentant les constructions existantes et le projet', required: true },
        { code: 'DP3', name: 'Plan en coupe', description: 'Coupe du terrain et de la construction montrant l\'implantation', required: true },
        { code: 'DP4', name: 'Plan des façades et toitures', description: 'Représentation des façades et toitures', required: true },
        { code: 'DP5', name: 'Représentation de l\'aspect extérieur', description: 'Document graphique montrant l\'insertion dans l\'environnement', required: false },
        { code: 'DP6', name: 'Document photographique', description: 'Photos du terrain et des constructions avoisinantes', required: true },
        { code: 'DP7', name: 'Notice descriptive', description: 'Description des matériaux et couleurs utilisés', required: false },
        { code: 'DP8', name: 'Plan de la parcelle cadastrale', description: 'Extrait du plan cadastral', required: false },
      ],
      PC: [
        { code: 'PCMI1', name: 'Plan de situation', description: 'Plan permettant de situer le terrain dans la commune', required: true },
        { code: 'PCMI2', name: 'Plan de masse', description: 'Plan de masse des constructions à édifier ou modifier', required: true },
        { code: 'PCMI3', name: 'Plan en coupe', description: 'Coupe du terrain et de la construction', required: true },
        { code: 'PCMI4', name: 'Notice descriptive', description: 'Description du projet et des matériaux utilisés', required: true },
        { code: 'PCMI5', name: 'Plan des façades et toitures', description: 'Représentation à l\'échelle des façades', required: true },
        { code: 'PCMI6', name: 'Document graphique d\'insertion', description: 'Insertion du projet dans son environnement', required: true },
        { code: 'PCMI7', name: 'Photo environnement proche', description: 'Photo des constructions avoisinantes', required: true },
        { code: 'PCMI8', name: 'Photo environnement lointain', description: 'Photo de la rue et du paysage', required: true },
      ],
      PA: [
        { code: 'PA1', name: 'Plan de situation', description: 'Plan de situation du terrain', required: true },
        { code: 'PA2', name: 'Notice du projet', description: 'Description du projet d\'aménagement', required: true },
        { code: 'PA3', name: 'Plan de l\'état actuel', description: 'Plan de l\'état actuel du terrain', required: true },
        { code: 'PA4', name: 'Plan de composition d\'ensemble', description: 'Plan montrant les divisions et aménagements', required: true },
      ],
    };

    if (authType === 'NONE') {
      return [{
        code: 'INFO',
        name: 'Aucun document requis',
        description: 'Votre projet ne nécessite pas d\'autorisation d\'urbanisme.',
        required: false,
      }];
    }

    return baseDocuments[authType as keyof typeof baseDocuments] || [];
  }
}
