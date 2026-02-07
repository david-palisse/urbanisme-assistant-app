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
import {
  generateSuggestions,
  shouldGenerateSuggestions,
  SuggestionContext,
} from './thresholds';

interface AnalysisInput {
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
  pluExtractedRules: Record<string, unknown> | null;
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
interface ValidationError {
  field: string;
  receivedValue: unknown;
  expectedValues: string[];
  message: string;
}

// Enum validation configuration
const ENUM_VALIDATIONS: Record<string, string[]> = {
  authorizationType: ['NONE', 'DP', 'PC', 'PA'],
  feasibilityStatus: ['compatible', 'compatible_a_risque', 'probablement_incompatible'],
  'constraints.severity': ['faible', 'moyenne', 'elevee'],
  'suggestions.impactSurProjet': ['faible', 'moyen', 'important'],
};

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
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure OPENAI_API_KEY in your environment.');
    }
    this.openai = new OpenAI({ apiKey });
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
      // Get full location regulatory info
      let pluZone = project.address?.pluZone;
      let pluZoneLabel = project.address?.pluZoneLabel;
      let pluDocumentName: string | null = null;
      let floodZoneData = null;
      let abfProtectionData = null;
      let naturalRisksData = null;
      let noiseExposureData = null;

      if (project.address) {
        // Always fetch full location info at analysis time for accuracy
        try {
          const fullInfo = await this.urbanismeService.getFullLocationInfo(
            project.address.lat,
            project.address.lon,
          );

          if (fullInfo.pluZone) {
            pluZone = fullInfo.pluZone.zoneCode;
            pluZoneLabel = fullInfo.pluZone.zoneLabel;
            pluDocumentName = fullInfo.pluZone.documentName || null;
          }

          if (!pluDocumentName && fullInfo.pluZones?.length) {
            pluDocumentName = fullInfo.pluZones.find((zone) => zone.documentName)?.documentName || null;
          }

          await this.prisma.address.update({
            where: { projectId },
            data: {
              pluZone: fullInfo.pluZone?.zoneCode || null,
              pluZoneLabel: fullInfo.pluZone?.zoneLabel || null,
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

          floodZoneData = fullInfo.floodZone;
          abfProtectionData = fullInfo.abfProtection;
          naturalRisksData = fullInfo.naturalRisks;
          noiseExposureData = fullInfo.noiseExposure;
        } catch (error) {
          this.logger.warn(`Failed to fetch regulatory info: ${error.message}`);
        }

        // Fallback to existing data from database if API fetch failed
        if (!floodZoneData) {
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
          noiseExposureData = {
            isInNoiseZone: project.address.isInNoiseZone,
            zone: project.address.noiseZone,
            airportName: project.address.noiseAirportName,
            airportCode: project.address.noiseAirportCode,
            restrictions: project.address.noiseRestrictions,
          };
        }
      }

      let pluExtractedRules: Record<string, unknown> | null = null;

      try {
        pluExtractedRules = await this.urbanismeService.getPluRuleset(
          project.address?.inseeCode || null,
          pluZone || null,
          pluDocumentName,
          project.address?.lat,
          project.address?.lon,
        );
      } catch (error) {
        this.logger.warn(`Failed to load PLU ruleset: ${error.message}`);
      }

      // Prepare analysis input
      const analysisInput: AnalysisInput = {
        projectType: project.projectType,
        projectName: project.name,
        questionnaireResponses: project.questionnaireResponse.responses as Record<string, unknown>,
        pluZone: pluZone ?? null,
        pluZoneLabel: pluZoneLabel ?? null,
        pluDocumentName: pluDocumentName ?? null,
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
        pluExtractedRules: pluExtractedRules,
      };

      // Perform LLM analysis
      const analysisResult = await this.performLLMAnalysis(analysisInput);
      const pluAdjustedResult = this.applyPluRulesToResult(analysisResult, analysisInput);
      const mergedResult = this.applyNoiseExposureRules(pluAdjustedResult, analysisInput);

      // Save analysis result
      const savedResult = await this.prisma.analysisResult.upsert({
        where: { projectId },
        create: {
          projectId,
          authorizationType: AuthorizationType[mergedResult.authorizationType],
          constraints: mergedResult.constraints,
          requiredDocuments: mergedResult.requiredDocuments,
          feasibilityStatus: mergedResult.feasibilityStatus,
          summary: mergedResult.summary,
          llmResponse: JSON.stringify(mergedResult),
        },
        update: {
          authorizationType: AuthorizationType[mergedResult.authorizationType],
          constraints: mergedResult.constraints,
          requiredDocuments: mergedResult.requiredDocuments,
          feasibilityStatus: mergedResult.feasibilityStatus,
          summary: mergedResult.summary,
          llmResponse: JSON.stringify(mergedResult),
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

  /**
   * Validate the LLM response against expected enum values
   * Returns an array of validation errors if any enum values are invalid
   */
  private validateLLMResponse(result: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate authorizationType
    if (result.authorizationType && !ENUM_VALIDATIONS.authorizationType.includes(result.authorizationType as string)) {
      errors.push({
        field: 'authorizationType',
        receivedValue: result.authorizationType,
        expectedValues: ENUM_VALIDATIONS.authorizationType,
        message: `Le champ "authorizationType" a une valeur invalide "${result.authorizationType}". Les valeurs possibles sont: ${ENUM_VALIDATIONS.authorizationType.join(', ')}`,
      });
    }

    // Validate feasibilityStatus
    if (result.feasibilityStatus && !ENUM_VALIDATIONS.feasibilityStatus.includes(result.feasibilityStatus as string)) {
      errors.push({
        field: 'feasibilityStatus',
        receivedValue: result.feasibilityStatus,
        expectedValues: ENUM_VALIDATIONS.feasibilityStatus,
        message: `Le champ "feasibilityStatus" a une valeur invalide "${result.feasibilityStatus}". Les valeurs possibles sont: ${ENUM_VALIDATIONS.feasibilityStatus.join(', ')}`,
      });
    }

    // Validate constraints severity
    const constraints = result.constraints as Array<{ severity?: string }> || [];
    constraints.forEach((constraint, index) => {
      if (constraint.severity && !ENUM_VALIDATIONS['constraints.severity'].includes(constraint.severity)) {
        errors.push({
          field: `constraints[${index}].severity`,
          receivedValue: constraint.severity,
          expectedValues: ENUM_VALIDATIONS['constraints.severity'],
          message: `Le champ "constraints[${index}].severity" a une valeur invalide "${constraint.severity}". Les valeurs possibles sont: ${ENUM_VALIDATIONS['constraints.severity'].join(', ')}`,
        });
      }
    });

    // Validate suggestions impactSurProjet
    const suggestions = result.suggestions as Array<{ impactSurProjet?: string }> || [];
    suggestions.forEach((suggestion, index) => {
      if (suggestion.impactSurProjet && !ENUM_VALIDATIONS['suggestions.impactSurProjet'].includes(suggestion.impactSurProjet)) {
        errors.push({
          field: `suggestions[${index}].impactSurProjet`,
          receivedValue: suggestion.impactSurProjet,
          expectedValues: ENUM_VALIDATIONS['suggestions.impactSurProjet'],
          message: `Le champ "suggestions[${index}].impactSurProjet" a une valeur invalide "${suggestion.impactSurProjet}". Les valeurs possibles sont: ${ENUM_VALIDATIONS['suggestions.impactSurProjet'].join(', ')}`,
        });
      }
    });

    return errors;
  }

  /**
   * Build a correction prompt for the LLM when validation errors are found
   */
  private buildCorrectionPrompt(originalResponse: string, errors: ValidationError[]): string {
    let prompt = `Ton JSON précédent contient des erreurs de valeurs enum. Voici le JSON que tu as retourné:

\`\`\`json
${originalResponse}
\`\`\`

**ERREURS DE VALIDATION DÉTECTÉES:**
`;

    errors.forEach((error, index) => {
      prompt += `
${index + 1}. **${error.field}**: Tu as utilisé "${error.receivedValue}"
   - Valeurs autorisées: ${error.expectedValues.map(v => `"${v}"`).join(' | ')}
   - ${error.message}`;
    });

    prompt += `

**CORRIGE le JSON ci-dessus en utilisant UNIQUEMENT les valeurs enum autorisées.**

Rappel des valeurs possibles:
- authorizationType: "NONE" | "DP" | "PC" | "PA"
- feasibilityStatus: "compatible" | "compatible_a_risque" | "probablement_incompatible"
- constraints.severity: "faible" | "moyenne" | "elevee"
- suggestions.impactSurProjet: "faible" | "moyen" | "important"

Retourne UNIQUEMENT le JSON corrigé, sans explication.`;

    return prompt;
  }

  private async performLLMAnalysis(input: AnalysisInput): Promise<LLMAnalysisResult> {
    const model = this.configService.get<string>('openai.model') || 'gpt-4o';
    const maxRetries = 2; // Maximum number of retry attempts

    const systemPrompt = `Tu es un assistant expert en urbanisme français. Tu analyses des projets de construction et tu détermines:
1. Le type d'autorisation nécessaire (aucune, Déclaration Préalable DP, Permis de Construire PC, Permis d'Aménager PA)
2. La faisabilité du projet selon les règles d'urbanisme ET les contraintes réglementaires (zones inondables, protection des monuments historiques, etc.)
3. Les contraintes et risques potentiels - PARTICULIÈREMENT IMPORTANT: les zones inondables rouges et la protection ABF peuvent rendre un projet IMPOSSIBLE
4. La liste des documents requis pour constituer le dossier
5. Des SUGGESTIONS D'AJUSTEMENT si des modifications mineures peuvent simplifier les démarches

RÈGLES DE PRIORITÉ (IMPORTANT):
- Quand une règle générale (ex: recul aux limites séparatives 6m) coexiste avec une exception liée au type de projet (ex: piscine 3m), tu dois TOUJOURS appliquer et expliquer l'exception correspondant au type de projet.
- Ne présente pas la règle générale comme applicable si une exception explicite existe pour le projet analysé.

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

=== SUGGESTIONS D'AJUSTEMENT ===
Si le projet nécessite un Permis de Construire (PC) ou présente des contraintes, analyse si de petits ajustements pourraient simplifier les démarches.

Règles de suggestion:
1. Suggérer UNIQUEMENT si la valeur actuelle dépasse le seuil de 25% ou moins
2. Limiter à maximum 3 suggestions
3. Prioriser par impact (faible → moyen → important)

Seuils de référence:
| Type de projet | Champ | Seuil | En-dessous | Au-dessus |
|----------------|-------|-------|------------|------------|
| EXTENSION (zone U*) | surface_plancher | 40 m² | DP | PC |
| EXTENSION (zone A/N) | surface_plancher | 20 m² | DP | PC |
| POOL | surface | 10 m² | NONE | DP |
| POOL | surface | 100 m² | DP | PC |
| SHED | surface | 5 m² | NONE | DP |
| SHED | surface | 20 m² | DP | PC |
| FENCE | hauteur | 2 m | DP | PC |

Exemples de suggestions:
- Extension 45m² en zone U: "En réduisant votre extension de 5 m² (de 45 à 40 m²), vous passeriez d'un Permis de Construire à une simple Déclaration Préalable"
- Piscine 105m²: "Une piscine de 100 m² ou moins nécessiterait seulement une Déclaration Préalable"

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
  ],
  "suggestions": [
    {
      "description": "Description de la suggestion d'ajustement",
      "impactSurProjet": "faible" | "moyen" | "important",
      "targetField": "Champ concerné (ex: extension_surface_plancher)",
      "currentValue": 45,
      "suggestedValue": 40,
      "thresholdValue": 40,
      "currentAuthorizationType": "PC",
      "resultingAuthorizationType": "DP"
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
Document PLU: ${input.pluDocumentName || 'Non déterminé'}
Localisation: ${input.address ? `${input.address.city} (${input.address.postCode})` : 'Non renseignée'}

Règles PLU locales extraites: ${input.pluExtractedRules ? JSON.stringify(input.pluExtractedRules, null, 2) : 'Non disponibles'}

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

    // Build conversation messages for potential retries
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model,
          messages,
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
          throw new Error('Invalid LLM response structure: missing required fields');
        }

        // Validate enum values
        const validationErrors = this.validateLLMResponse(result as unknown as Record<string, unknown>);

        if (validationErrors.length > 0) {
          retryCount++;

          if (retryCount > maxRetries) {
            // Max retries reached, log and use fallback correction
            this.logger.warn(
              `LLM returned invalid enum values after ${maxRetries} retries. Errors: ${JSON.stringify(validationErrors)}. Using fallback correction.`,
            );

            // Apply fallback corrections
            if (!ENUM_VALIDATIONS.authorizationType.includes(result.authorizationType)) {
              this.logger.warn(`Correcting invalid authorizationType "${result.authorizationType}" to "DP"`);
              (result as unknown as { authorizationType: string }).authorizationType = 'DP';
            }
            if (!ENUM_VALIDATIONS.feasibilityStatus.includes(result.feasibilityStatus)) {
              this.logger.warn(`Correcting invalid feasibilityStatus "${result.feasibilityStatus}" to "compatible"`);
              (result as unknown as { feasibilityStatus: string }).feasibilityStatus = 'compatible';
            }

            // Correct constraints severity
            if (result.constraints) {
              result.constraints.forEach((constraint) => {
                if (!ENUM_VALIDATIONS['constraints.severity'].includes(constraint.severity)) {
                  constraint.severity = 'moyenne';
                }
              });
            }
          } else {
            // Build correction message and retry
            this.logger.warn(
              `LLM returned invalid enum values (attempt ${retryCount}/${maxRetries}). Sending correction request. Errors: ${validationErrors.map(e => e.message).join('; ')}`,
            );

            // Add the assistant's response and correction request to the conversation
            messages.push({ role: 'assistant', content });
            messages.push({ role: 'user', content: this.buildCorrectionPrompt(content, validationErrors) });

            // Continue to next iteration for retry
            continue;
          }
        }

        // Validation passed or corrections applied - generate suggestions
        const validResult = result as LLMAnalysisResult;

        if (shouldGenerateSuggestions(validResult.authorizationType, validResult.feasibilityStatus)) {
          const suggestionContext: SuggestionContext = {
            projectType: input.projectType,
            questionnaireResponses: input.questionnaireResponses || {},
            pluZone: input.pluZone ?? undefined,
            currentAuthorizationType: validResult.authorizationType,
            feasibilityStatus: validResult.feasibilityStatus,
          };

          const suggestions = generateSuggestions(suggestionContext);

          if (suggestions.length > 0) {
            validResult.suggestions = suggestions;
          }
        }

        return validResult;
      } catch (error) {
        this.logger.error(`LLM analysis error (attempt ${retryCount + 1}): ${error.message}`);
        retryCount++;

        if (retryCount > maxRetries) {
          throw new Error(`LLM analysis failed after ${maxRetries + 1} attempts: ${error.message}`);
        }

        // For JSON parse errors or other issues, wait a bit and retry with original prompt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Should not reach here, but throw error just in case
    throw new Error('LLM analysis failed: maximum retries exceeded');
  }

  private applyPluRulesToResult(
    result: LLMAnalysisResult,
    input: AnalysisInput,
  ): LLMAnalysisResult {
    if (!input.pluExtractedRules) return result;

    const mergedResult: LLMAnalysisResult = {
      ...result,
      constraints: [...(result.constraints || [])],
      requiredDocuments: [...(result.requiredDocuments || [])],
      summary: result.summary || '',
    };

    const rules = input.pluExtractedRules as Record<string, any>;

    if (input.projectType === 'POOL') {
      const minSetbackCandidate =
        rules?.pool?.minNeighborSetbackMeters ??
        rules?.setbackToNeighborMeters ??
        rules?.setbacks?.neighborMeters ??
        rules?.reglesGenerales?.reculLimitesSeparatives?.valeurMetres ??
        undefined;
      const minSetback =
        typeof minSetbackCandidate === 'number' && !Number.isNaN(minSetbackCandidate)
          ? minSetbackCandidate
          : undefined;
      const distanceRaw = input.questionnaireResponses['distance_limite_separative'] as number;
      const distance = Number(distanceRaw);

      if (minSetback !== undefined && !Number.isNaN(distance) && distance < minSetback) {
        const normalizedConstraint = {
          type: 'Implantation - limite séparative',
          description: `Distance à la limite séparative (${distance} m) inférieure au minimum de ${minSetback} m requis par le PLU local.`,
          severity: 'elevee' as const,
        };

        // Avoid contradictory duplicate constraints like “3m” vs “6m” on the same topic.
        // If the LLM already produced a constraint about limits séparatives, replace it.
        const existingIdx = mergedResult.constraints.findIndex((c) => {
          const t = (c.type || '').toLowerCase();
          const d = (c.description || '').toLowerCase();
          return (
            (t.includes('limite') && (t.includes('sépar') || t.includes('separ')))
            || (d.includes('limite') && (d.includes('sépar') || d.includes('separ')))
          );
        });
        if (existingIdx >= 0) {
          mergedResult.constraints[existingIdx] = normalizedConstraint;
        } else {
          mergedResult.constraints.push(normalizedConstraint);
        }

        mergedResult.feasibilityStatus = 'probablement_incompatible';
        // Keep the summary readable and aligned with the pool-specific exception.
        // If the LLM produced a generic “6m” statement, append a clarifying sentence.
        mergedResult.summary = `${mergedResult.summary} Non-conformité : pour une piscine, la distance minimale à la limite séparative est de ${minSetback} m (règle spécifique).`;

        // Add an explicit suggestion to make the project compliant (increase the setback).
        // This is not supported by the generic threshold suggestion engine (which only suggests reductions),
        // so we attach it here when we have a concrete PLU minimum.
        const existing = mergedResult.suggestions ? [...mergedResult.suggestions] : [];
        const hasDistanceSuggestion = existing.some((s) => s.targetField === 'distance_limite_separative');
        if (!hasDistanceSuggestion) {
          existing.push({
            description: `Pour être conforme au PLU, augmentez la distance à la limite séparative à au moins ${minSetback} m (au lieu de ${distance} m).`,
            impactSurProjet: 'important',
            targetField: 'distance_limite_separative',
            currentValue: distance,
            suggestedValue: minSetback,
            thresholdValue: minSetback,
            currentAuthorizationType: mergedResult.authorizationType,
            resultingAuthorizationType: mergedResult.authorizationType,
          });
          mergedResult.suggestions = existing;
        }
      }

      const cbsRequired =
        rules?.pool?.cbsRequired ??
        rules?.cbsRequired ??
        rules?.reglesGenerales?.cbsRequired ??
        false;

      if (cbsRequired) {
        const cbsReference = rules?.pool?.cbsReference || rules?.cbsReference || 'PLU local';
        const existingCbsConstraint = mergedResult.constraints.some((constraint) =>
          constraint.type.toLowerCase().includes('cbs')
        );

        if (!existingCbsConstraint) {
          mergedResult.constraints.push({
            type: 'CBS (Coefficient de Biotope de Surface)',
            description: `Calcul du CBS obligatoire pour les piscines (${cbsReference}).`,
            severity: 'moyenne',
          });
        }

        const existingCbsDocument = mergedResult.requiredDocuments.some((doc) =>
          doc.code.toLowerCase().includes('cbs') || doc.name.toLowerCase().includes('cbs')
        );

        if (!existingCbsDocument) {
          mergedResult.requiredDocuments.push({
            code: 'CBS',
            name: 'Calcul du CBS',
            description: `Note de calcul du coefficient de biotope de surface exigée (${cbsReference}).`,
            required: true,
          });
        }
      }
    }

    return mergedResult;
  }

  private applyNoiseExposureRules(
    result: LLMAnalysisResult,
    input: AnalysisInput,
  ): LLMAnalysisResult {
    if (!input.noiseExposure?.isInNoiseZone || !input.noiseExposure.zone) {
      return result;
    }

    const mergedResult: LLMAnalysisResult = {
      ...result,
      constraints: [...(result.constraints || [])],
      requiredDocuments: [...(result.requiredDocuments || [])],
      summary: result.summary || '',
    };

    const zone = input.noiseExposure.zone.toUpperCase();
    const existingNoiseConstraint = mergedResult.constraints.some((constraint) =>
      constraint.type.toLowerCase().includes('bruit') ||
      constraint.type.toLowerCase().includes('peb')
    );

    if (!existingNoiseConstraint) {
      let description = input.noiseExposure.restrictions || `Zone ${zone} du PEB.`;
      let severity: 'faible' | 'moyenne' | 'elevee' = 'faible';

      if (zone === 'A') severity = 'elevee';
      if (zone === 'B') severity = 'moyenne';
      if (zone === 'C') severity = 'moyenne';

      mergedResult.constraints.push({
        type: 'Bruit aérien (PEB)',
        description,
        severity,
      });
    }

    if (zone === 'D') {
      const existingAttestation = mergedResult.requiredDocuments.some((doc) =>
        doc.code.toLowerCase().includes('acoustique') ||
        doc.name.toLowerCase().includes('acoustique')
      );

      if (!existingAttestation) {
        mergedResult.requiredDocuments.push({
          code: 'ATTEST_ACOUSTIQUE',
          name: 'Attestation acoustique PEB',
          description: 'Attestation de prise en compte de la réglementation acoustique en zone D du PEB.',
          required: true,
        });
      }

      if (mergedResult.feasibilityStatus === 'compatible') {
        mergedResult.feasibilityStatus = 'compatible_a_risque';
      }
    }

    return mergedResult;
  }
}
