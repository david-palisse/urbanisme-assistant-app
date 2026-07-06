import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UrbanismeService } from '../urbanisme/urbanisme.service';
import { AuthorizationType, ProjectStatus } from '@prisma/client';
import { AnalysisInput } from './analysis.types';
import { LlmAnalyzerService } from './llm/llm-analyzer.service';
import {
  applyPluRulesToResult,
  applyNoiseExposureRules,
} from './rules/post-processing';

/**
 * Orchestrates a project analysis: gathers regulatory data, runs the LLM
 * analysis and persists the result.
 */
@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private urbanismeService: UrbanismeService,
    private llmAnalyzer: LlmAnalyzerService,
  ) {}

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
          project.projectType,
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
      const analysisResult = await this.llmAnalyzer.performLLMAnalysis(analysisInput);
      const pluAdjustedResult = applyPluRulesToResult(analysisResult, analysisInput);
      const mergedResult = applyNoiseExposureRules(pluAdjustedResult, analysisInput);

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
}
