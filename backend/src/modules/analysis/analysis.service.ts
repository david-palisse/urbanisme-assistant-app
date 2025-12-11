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
  pluZoneLabel: string | null;
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
      // Get full location regulatory info if not already set
      let pluZone = project.address?.pluZone;
      let pluZoneLabel = project.address?.pluZoneLabel;
      let floodZoneData = null;
      let abfProtectionData = null;
      let naturalRisksData = null;
      let noiseExposureData = null;

      if (project.address) {
        // Check if we need to fetch updated regulatory info
        const needsRegulatoryUpdate = !project.address.pluZone ||
          (project.address.floodZone === null && project.address.isAbfProtected === false);

        if (needsRegulatoryUpdate) {
          // Fetch full location info from urbanisme service
          try {
            const fullInfo = await this.urbanismeService.getFullLocationInfo(
              project.address.lat,
              project.address.lon,
            );

            if (fullInfo.pluZone) {
              pluZone = fullInfo.pluZone.zoneCode;
              pluZoneLabel = fullInfo.pluZone.zoneLabel;
              await this.prisma.address.update({
                where: { projectId },
                data: {
                  pluZone: fullInfo.pluZone.zoneCode,
                  pluZoneLabel: fullInfo.pluZone.zoneLabel,
                  floodZone: fullInfo.floodZone.zoneType,
                  floodZoneLevel: fullInfo.floodZone.riskLevel,
                  floodZoneSource: fullInfo.floodZone.sourceName,
                  isAbfProtected: fullInfo.abfProtection.isProtected,
                  abfType: fullInfo.abfProtection.protectionType,
                  abfPerimeter: fullInfo.abfProtection.perimeterDescription,
                  abfMonumentName: fullInfo.abfProtection.monumentName,
                  seismicZone: fullInfo.naturalRisks.seismicZone,
                  clayRisk: fullInfo.naturalRisks.clayRisk,
                  // Noise exposure (PEB) data
                  isInNoiseZone: fullInfo.noiseExposure.isInNoiseZone,
                  noiseZone: fullInfo.noiseExposure.zone,
                  noiseAirportName: fullInfo.noiseExposure.airportName,
                  noiseAirportCode: fullInfo.noiseExposure.airportCode,
                  noiseRestrictions: fullInfo.noiseExposure.restrictions,
                },
              });
            }

            floodZoneData = fullInfo.floodZone;
            abfProtectionData = fullInfo.abfProtection;
            naturalRisksData = fullInfo.naturalRisks;
            noiseExposureData = fullInfo.noiseExposure;
          } catch (error) {
            this.logger.warn(`Failed to fetch regulatory info: ${error.message}`);
          }
        } else {
          // Use existing data from database
          floodZoneData = {
            isInFloodZone: !!project.address.floodZone,
            zoneType: project.address.floodZone,
            riskLevel: project.address.floodZoneLevel,
            sourceName: project.address.floodZoneSource,
            description: null,
          };
          abfProtectionData = {
            isProtected: project.address.isAbfProtected,
            protectionType: project.address.abfType,
            perimeterDescription: project.address.abfPerimeter,
            monumentName: project.address.abfMonumentName,
          };
          naturalRisksData = {
            seismicZone: project.address.seismicZone,
            clayRisk: project.address.clayRisk,
          };
          // Use existing noise exposure data from database
          noiseExposureData = {
            isInNoiseZone: project.address.isInNoiseZone,
            zone: project.address.noiseZone,
            airportName: project.address.noiseAirportName,
            airportCode: project.address.noiseAirportCode,
            restrictions: project.address.noiseRestrictions,
          };
        }
      }

      // Prepare analysis input
      const analysisInput: AnalysisInput = {
        projectType: project.projectType,
        projectName: project.name,
        questionnaireResponses: project.questionnaireResponse.responses as Record<string, unknown>,
        pluZone: pluZone ?? null,
        pluZoneLabel: pluZoneLabel ?? null,
        address: project.address
          ? {
              city: project.address.cityName,
              postCode: project.address.postCode,
              parcelId: project.address.parcelId,
            }
          : null,
        floodZone: floodZoneData,
        abfProtection: abfProtectionData,
        naturalRisks: naturalRisksData,
        noiseExposure: noiseExposureData,
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
2. La faisabilité du projet selon les règles d'urbanisme ET les contraintes réglementaires (zones inondables, protection des monuments historiques, etc.)
3. Les contraintes et risques potentiels - PARTICULIÈREMENT IMPORTANT: les zones inondables rouges et la protection ABF peuvent rendre un projet IMPOSSIBLE
4. La liste des documents requis pour constituer le dossier

RÈGLES IMPORTANTES POUR LE TYPE D'AUTORISATION:

=== EXTENSIONS (RÈGLE CRITIQUE) ===
- En ZONE URBAINE (U*) avec PLU approuvé : seuil = 40 m²
  * Surface de plancher ≤ 40 m² → Déclaration Préalable (DP)
  * Surface de plancher > 40 m² → Permis de Construire (PC)
- En ZONE AGRICOLE (A), NATURELLE (N) ou SANS PLU : seuil = 20 m²
  * Surface de plancher ≤ 20 m² → Déclaration Préalable (DP)
  * Surface de plancher > 20 m² → Permis de Construire (PC)
- EXEMPLE: Extension de 60 m² en zone U (comme UMeL1p) → PC obligatoire (60 > 40)

=== AUTRES RÈGLES ===
- Si le terrain est en ZONE INONDABLE ROUGE: le projet est généralement INTERDIT pour toute construction nouvelle ou extension. Marque le projet comme "probablement_incompatible" et explique clairement l'interdiction.
- Si le terrain est en ZONE INONDABLE BLEUE ou ORANGE: des restrictions s'appliquent (surélévation, matériaux spéciaux). Marque comme "compatible_a_risque".
- Si le terrain est dans un PÉRIMÈTRE ABF (Architecte des Bâtiments de France) - monument historique, SPR, AVAP: l'avis de l'ABF est OBLIGATOIRE, les délais sont allongés (+1 mois), et les contraintes architecturales sont strictes.
- Si zone inondable rouge ET ABF: le projet est très probablement IMPOSSIBLE.

Tu dois répondre UNIQUEMENT en JSON valide selon le schéma suivant:
{
  "authorizationType": "NONE" | "DP" | "PC" | "PA",
  "feasibilityStatus": "compatible" | "compatible_a_risque" | "probablement_incompatible",
  "summary": "Résumé de l'analyse en 2-3 phrases INCLUANT les contraintes réglementaires majeures (zone inondable, ABF)",
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

    // Build flood zone section for prompt
    let floodZoneInfo = 'Non vérifiée';
    if (input.floodZone) {
      if (input.floodZone.isInFloodZone) {
        floodZoneInfo = `⚠️ ZONE INONDABLE DÉTECTÉE - Type: ${input.floodZone.zoneType || 'Non précisé'}, Niveau de risque: ${input.floodZone.riskLevel || 'Non précisé'}`;
        if (input.floodZone.sourceName) {
          floodZoneInfo += ` (Source: ${input.floodZone.sourceName})`;
        }
        if (input.floodZone.description) {
          floodZoneInfo += `. ${input.floodZone.description}`;
        }
      } else {
        floodZoneInfo = 'Hors zone inondable';
      }
    }

    // Build ABF protection section for prompt
    let abfInfo = 'Non vérifiée';
    if (input.abfProtection) {
      if (input.abfProtection.isProtected) {
        abfInfo = `⚠️ PÉRIMÈTRE PROTÉGÉ ABF - Type: ${input.abfProtection.protectionType || 'Monument Historique'}`;
        if (input.abfProtection.monumentName) {
          abfInfo += ` (${input.abfProtection.monumentName})`;
        }
        if (input.abfProtection.perimeterDescription) {
          abfInfo += `. ${input.abfProtection.perimeterDescription}`;
        }
        abfInfo += '. Avis ABF obligatoire, délais allongés, contraintes architecturales strictes.';
      } else {
        abfInfo = 'Hors périmètre protégé';
      }
    }

    // Build natural risks section
    let naturalRisksInfo = '';
    if (input.naturalRisks) {
      const risks = [];
      if (input.naturalRisks.seismicZone) {
        risks.push(`Zone sismique: ${input.naturalRisks.seismicZone}`);
      }
      if (input.naturalRisks.clayRisk) {
        risks.push(`Risque argile: ${input.naturalRisks.clayRisk}`);
      }
      naturalRisksInfo = risks.length > 0 ? risks.join(', ') : 'Aucun risque naturel majeur identifié';
    }

    // Build noise exposure (PEB) section
    let noiseExposureInfo = 'Non vérifiée';
    if (input.noiseExposure) {
      if (input.noiseExposure.isInNoiseZone) {
        noiseExposureInfo = `⚠️ ZONE DE BRUIT AÉROPORT (PEB) - Zone ${input.noiseExposure.zone || 'non précisée'}`;
        if (input.noiseExposure.airportName) {
          noiseExposureInfo += ` - Aéroport de ${input.noiseExposure.airportName}`;
          if (input.noiseExposure.airportCode) {
            noiseExposureInfo += ` (${input.noiseExposure.airportCode})`;
          }
        }
        if (input.noiseExposure.restrictions) {
          noiseExposureInfo += `. ${input.noiseExposure.restrictions}`;
        }
      } else {
        noiseExposureInfo = 'Hors zone de bruit aéroport';
      }
    }

    const userPrompt = `Analyse ce projet de construction:

Type de projet: ${input.projectType}
Nom du projet: ${input.projectName}
Zone PLU: ${input.pluZone || 'Non déterminée'}${input.pluZoneLabel ? ` (${input.pluZoneLabel})` : ''}
Localisation: ${input.address ? `${input.address.city} (${input.address.postCode})` : 'Non renseignée'}

=== CONTRAINTES RÉGLEMENTAIRES MAJEURES ===
Zone inondable (PPRI): ${floodZoneInfo}
Protection patrimoniale (ABF): ${abfInfo}
Zone de bruit aéroport (PEB): ${noiseExposureInfo}
Autres risques naturels: ${naturalRisksInfo}
==========================================

Réponses au questionnaire:
${JSON.stringify(input.questionnaireResponses, null, 2)}

IMPORTANT: Prends en compte les contraintes réglementaires majeures ci-dessus pour déterminer la faisabilité du projet. Si le terrain est en zone inondable rouge, le projet est généralement interdit.

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

    // Check flood zone - RED ZONE = PROJECT LIKELY IMPOSSIBLE
    const isInRedFloodZone = input.floodZone?.isInFloodZone &&
      (input.floodZone.zoneType?.toLowerCase().includes('rouge') ||
       input.floodZone.riskLevel?.toLowerCase() === 'fort');
    const isInFloodZone = input.floodZone?.isInFloodZone;

    // Check ABF protection
    const isAbfProtected = input.abfProtection?.isProtected;

    // If in RED flood zone, project is likely impossible
    if (isInRedFloodZone) {
      feasibilityStatus = 'probablement_incompatible';
    } else if (isInFloodZone || isAbfProtected) {
      feasibilityStatus = 'compatible_a_risque';
    }

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
        // Check if we're in an urban zone (U) with PLU - threshold is 40m²
        // Otherwise (A/N zones or no PLU) - threshold is 20m²
        const isUrbanZoneWithPLU = input.pluZone && input.pluZone.toUpperCase().startsWith('U');
        const extensionThreshold = isUrbanZoneWithPLU ? 40 : 20;

        // Extension > threshold requires PC, <= threshold requires DP
        if (extensionSurface > extensionThreshold) {
          authorizationType = 'PC';
        } else {
          authorizationType = 'DP';
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

    // Check setback distances for additional risk assessment
    const distanceLimite = (responses.distance_limite_separative as number) || 999;
    if (distanceLimite < 3 && feasibilityStatus === 'compatible') {
      feasibilityStatus = 'compatible_a_risque';
    }

    return {
      authorizationType,
      feasibilityStatus,
      summary: this.generateSummary(input, authorizationType, feasibilityStatus),
      constraints: this.generateConstraints(input, distanceLimite),
      requiredDocuments: this.getRequiredDocuments(authorizationType, input.projectType),
    };
  }

  private generateSummary(
    input: AnalysisInput,
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

    const name = projectNames[input.projectType] || 'projet';
    const auth = authNames[authType] || authType;

    // Check for major constraints
    const isInRedFloodZone = input.floodZone?.isInFloodZone &&
      (input.floodZone.zoneType?.toLowerCase().includes('rouge') ||
       input.floodZone.riskLevel?.toLowerCase() === 'fort');
    const isInFloodZone = input.floodZone?.isInFloodZone;
    const isAbfProtected = input.abfProtection?.isProtected;

    let summary = '';

    if (isInRedFloodZone) {
      summary = `⚠️ ATTENTION: Le terrain est situé en ZONE INONDABLE ROUGE (risque fort). `;
      summary += `Le projet de ${name} est très probablement INTERDIT dans cette zone. `;
      summary += `Les constructions nouvelles et extensions sont généralement interdites par le Plan de Prévention du Risque Inondation (PPRI). `;
      if (input.floodZone?.sourceName) {
        summary += `Source: ${input.floodZone.sourceName}. `;
      }
      summary += `Nous vous recommandons fortement de consulter le service urbanisme de votre mairie avant toute démarche.`;
    } else if (isInFloodZone && isAbfProtected) {
      summary = `⚠️ ATTENTION: Le terrain cumule deux contraintes majeures: `;
      summary += `zone inondable (${input.floodZone?.zoneType || 'type non précisé'}) ET périmètre protégé ABF (${input.abfProtection?.protectionType || 'Monument Historique'}). `;
      summary += `Votre projet de ${name} nécessiterait ${auth}, mais les contraintes sont très strictes. `;
      summary += `L'avis de l'Architecte des Bâtiments de France est obligatoire et des restrictions liées au PPRI s'appliquent.`;
    } else if (isInFloodZone) {
      summary = `⚠️ Le terrain est situé en zone inondable (${input.floodZone?.zoneType || 'type à vérifier'}). `;
      summary += `Votre projet de ${name} nécessite ${auth}. `;
      summary += `Des restrictions du PPRI peuvent s'appliquer (surélévation, matériaux adaptés, etc.). `;
      summary += `Consultez le service urbanisme de votre commune.`;
    } else if (isAbfProtected) {
      summary = `⚠️ Le terrain est situé dans un périmètre protégé (${input.abfProtection?.protectionType || 'Monument Historique'}`;
      if (input.abfProtection?.monumentName) {
        summary += `: ${input.abfProtection.monumentName}`;
      }
      summary += `). `;
      summary += `Votre projet de ${name} nécessite ${auth} avec avis obligatoire de l'Architecte des Bâtiments de France. `;
      summary += `Les délais d'instruction sont allongés d'environ 1 mois et les contraintes architecturales sont strictes.`;
    } else {
      summary = `Votre projet de ${name} nécessite ${auth}. `;

      if (feasibility === 'compatible') {
        summary += 'Le projet semble conforme aux règles d\'urbanisme applicables.';
      } else if (feasibility === 'compatible_a_risque') {
        summary += 'Le projet présente certains points d\'attention qui pourraient nécessiter des ajustements.';
      } else {
        summary += 'Le projet présente des incompatibilités potentielles avec la réglementation en vigueur.';
      }
    }

    return summary;
  }

  private generateConstraints(
    input: AnalysisInput,
    distanceLimite: number,
  ): LLMAnalysisResult['constraints'] {
    const constraints: LLMAnalysisResult['constraints'] = [];

    // Flood zone constraints - MOST IMPORTANT
    if (input.floodZone?.isInFloodZone) {
      const isRedZone = input.floodZone.zoneType?.toLowerCase().includes('rouge') ||
        input.floodZone.riskLevel?.toLowerCase() === 'fort';

      if (isRedZone) {
        constraints.push({
          type: 'Zone inondable rouge',
          description: `Le terrain est situé en zone inondable à risque fort (zone rouge). Les constructions nouvelles et extensions sont généralement INTERDITES par le PPRI. ${input.floodZone.sourceName ? `(${input.floodZone.sourceName})` : ''}`,
          severity: 'elevee',
        });
      } else {
        constraints.push({
          type: 'Zone inondable',
          description: `Le terrain est situé en zone inondable (${input.floodZone.zoneType || 'type à vérifier'}). Des restrictions s'appliquent: surélévation obligatoire, matériaux adaptés, etc. ${input.floodZone.sourceName ? `(${input.floodZone.sourceName})` : ''}`,
          severity: 'moyenne',
        });
      }
    }

    // ABF protection constraints
    if (input.abfProtection?.isProtected) {
      constraints.push({
        type: 'Périmètre protégé ABF',
        description: `Le terrain est dans le périmètre de protection d'un ${input.abfProtection.protectionType === 'MH' ? 'Monument Historique' : input.abfProtection.protectionType || 'monument protégé'}${input.abfProtection.monumentName ? ` (${input.abfProtection.monumentName})` : ''}. L'avis de l'Architecte des Bâtiments de France est obligatoire. ${input.abfProtection.perimeterDescription || ''}`,
        severity: 'moyenne',
      });
    }

    // Setback distance constraints
    if (distanceLimite < 3) {
      constraints.push({
        type: 'Recul limite séparative',
        description: `La distance à la limite séparative (${distanceLimite}m) est inférieure au minimum généralement requis (3m).`,
        severity: distanceLimite < 1 ? 'elevee' : 'moyenne',
      });
    }

    // PLU zone not identified
    if (!input.pluZone) {
      constraints.push({
        type: 'Zone PLU non identifiée',
        description: 'La zone PLU n\'a pas pu être identifiée. Les règles spécifiques à votre parcelle n\'ont pas été vérifiées.',
        severity: 'moyenne',
      });
    }

    // Natural risks
    if (input.naturalRisks?.clayRisk === 'fort') {
      constraints.push({
        type: 'Risque retrait-gonflement argile',
        description: 'Fort risque de retrait-gonflement des argiles. Une étude géotechnique est recommandée et des dispositions constructives spécifiques peuvent être exigées.',
        severity: 'moyenne',
      });
    }

    // Noise exposure (PEB) constraints
    if (input.noiseExposure?.isInNoiseZone) {
      const zone = input.noiseExposure.zone;
      const isRestrictiveZone = zone === '1' || zone === '2' || zone === 'A' || zone === 'B';

      constraints.push({
        type: 'Zone de bruit a\u00e9roport (PEB)',
        description: `Le terrain est situ\u00e9 en zone ${zone || ''} du Plan d'Exposition au Bruit${input.noiseExposure.airportName ? ` de l'a\u00e9roport de ${input.noiseExposure.airportName}` : ''}. ${input.noiseExposure.restrictions || 'Des restrictions s\'appliquent aux constructions.'}`,
        severity: isRestrictiveZone ? 'elevee' : 'moyenne',
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
