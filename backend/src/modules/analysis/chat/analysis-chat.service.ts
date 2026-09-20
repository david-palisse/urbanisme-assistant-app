import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildChatSystemPrompt,
  ChatContext,
  serializePluRules,
} from './chat-prompts';
import { EntitlementService } from '../../billing/entitlement.service';
import { FullLocationInfo } from '../../urbanisme/urbanisme.service';

/** Number of past messages sent back to the LLM as conversation history */
const MAX_HISTORY_MESSAGES = 20;

/**
 * Conversational assistant about an analyzed project: answers user questions
 * using the project recap, the stored analysis result and the cached PLU
 * rules as context.
 */
@Injectable()
export class AnalysisChatService {
  private readonly logger = new Logger(AnalysisChatService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private entitlementService: EntitlementService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure OPENAI_API_KEY in your environment.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async getChatHistory(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, projectId: string, message: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        address: true,
        questionnaireResponse: true,
        analysisResult: true,
      },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    if (!project.analysisResult) {
      throw new BadRequestException(
        'Project must be analyzed before starting a conversation',
      );
    }

    // The Q&A is part of the paid packs (window of 30 days after payment)
    const entitlement =
      await this.entitlementService.getProjectEntitlement(projectId);
    if (!entitlement.unlocked) {
      throw new ForbiddenException(
        "L'assistant est réservé aux projets débloqués. Choisissez un pack pour poser vos questions.",
      );
    }
    if (!entitlement.chatAvailable) {
      throw new ForbiddenException(
        'Votre période de questions de 30 jours est terminée.',
      );
    }

    const systemPrompt = buildChatSystemPrompt(await this.buildContext(project));

    const history = await this.prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_MESSAGES,
    });
    history.reverse();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role === ChatRole.USER ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const model = this.configService.get<string>('openai.model') || 'gpt-4o';
    const questionAskedAt = new Date();

    let answer: string;
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        // gpt-5 and o-series reasoning models only accept the default temperature
        ...(/^(gpt-5|o\d)/i.test(model) ? {} : { temperature: 0.3 }),
      });

      answer = response.choices[0]?.message?.content?.trim() || '';
      if (!answer) {
        throw new Error('Empty response from LLM');
      }
    } catch (error) {
      this.logger.error(`Chat LLM error for project ${projectId}: ${error.message}`);
      throw new BadRequestException(
        "L'assistant n'a pas pu répondre. Veuillez réessayer.",
      );
    }

    // Persist the pair only once the LLM answered, with explicit timestamps
    // so ordering stays stable (now() is the same for both rows inside a
    // single transaction).
    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          projectId,
          role: ChatRole.USER,
          content: message,
          createdAt: questionAskedAt,
        },
      }),
      this.prisma.chatMessage.create({
        data: {
          projectId,
          role: ChatRole.ASSISTANT,
          content: answer,
          createdAt: new Date(Math.max(Date.now(), questionAskedAt.getTime() + 1)),
        },
      }),
    ]);

    return { userMessage, assistantMessage };
  }

  private async buildContext(project: {
    name: string;
    projectType: string;
    address: import('@prisma/client').Address | null;
    questionnaireResponse: import('@prisma/client').QuestionnaireResponse | null;
    analysisResult: import('@prisma/client').AnalysisResult | null;
  }): Promise<ChatContext> {
    const address = project.address;

    // Reuse the cached PLU ruleset if one exists for the zone; never trigger
    // an extraction from the chat (too slow/expensive per question).
    // The analysis keys the cache on the zone of the regulatory snapshot
    // (fullLocationInfo), which can differ from address.pluZone: try the same
    // zone first, then the address one, so the chat reads the ruleset the
    // analysis actually used.
    let pluRulesJson: string | null = null;
    const snapshot = address?.fullLocationInfo as unknown as FullLocationInfo | null;
    const candidateZones = [
      ...new Set(
        [snapshot?.pluZone?.zoneCode, address?.pluZone].filter(
          (zone): zone is string => !!zone,
        ),
      ),
    ];
    if (address?.inseeCode) {
      for (const zoneCode of candidateZones) {
        const cached = await this.prisma.pluRulesCache.findUnique({
          where: {
            zoneCode_inseeCode: { zoneCode, inseeCode: address.inseeCode },
          },
        });
        if (cached?.rules && Object.keys(cached.rules as object).length > 0) {
          pluRulesJson = serializePluRules({
            ...(cached.rules as Record<string, unknown>),
            _meta: {
              documentName: cached.documentName,
              documentDate: cached.documentDate,
              sourceUrl: cached.sourceUrl,
            },
          });
          break;
        }
      }
    }

    return {
      projectName: project.name,
      projectType: project.projectType,
      city: address?.cityName ?? null,
      postCode: address?.postCode ?? null,
      parcelId: address?.parcelId ?? null,
      pluZone: address?.pluZone ?? null,
      pluZoneLabel: address?.pluZoneLabel ?? null,
      floodZone: address?.floodZone ?? null,
      floodZoneLevel: address?.floodZoneLevel ?? null,
      isAbfProtected: address?.isAbfProtected ?? false,
      abfMonumentName: address?.abfMonumentName ?? null,
      seismicZone: address?.seismicZone ?? null,
      clayRisk: address?.clayRisk ?? null,
      isInNoiseZone: address?.isInNoiseZone ?? false,
      noiseZone: address?.noiseZone ?? null,
      noiseAirportName: address?.noiseAirportName ?? null,
      questionnaireResponses:
        (project.questionnaireResponse?.responses as Record<string, unknown> | null) ?? null,
      analysisResultJson: project.analysisResult?.llmResponse ?? null,
      pluRulesJson,
    };
  }
}
