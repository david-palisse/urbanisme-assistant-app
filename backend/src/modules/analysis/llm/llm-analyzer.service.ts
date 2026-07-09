import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AnalysisInput, LLMAnalysisResult } from '../analysis.types';
import {
  generateSuggestions,
  shouldGenerateSuggestions,
  SuggestionContext,
} from '../thresholds';
import { ENUM_VALIDATIONS, validateLLMResponse } from './validation';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  buildCorrectionPrompt,
} from './prompts';
import { ANALYSIS_RESULT_JSON_SCHEMA } from './response-schema';
import { normalizeRequiredDocuments } from '../rules/post-processing';
import { StageTimer } from '../../../common/metrics/stage-timer';

/**
 * Runs the LLM feasibility analysis of a project, with enum validation,
 * correction retries and threshold-based adjustment suggestions.
 */
@Injectable()
export class LlmAnalyzerService {
  private readonly logger = new Logger(LlmAnalyzerService.name);
  private openai: OpenAI;

  /**
   * Structured Outputs (strict json_schema) enforce the enums at generation
   * time. If the configured model rejects it, we permanently fall back to
   * json_object + validation retries for this process.
   */
  private jsonSchemaSupported = true;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure OPENAI_API_KEY in your environment.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async performLLMAnalysis(input: AnalysisInput, metrics?: StageTimer): Promise<LLMAnalysisResult> {
    const model = this.configService.get<string>('openai.model') || 'gpt-4o';
    const maxRetries = 2; // Maximum number of retry attempts

    const userPrompt = buildAnalysisUserPrompt(input);

    // Build conversation messages for potential retries
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model,
          messages,
          response_format: this.jsonSchemaSupported
            ? {
                type: 'json_schema',
                json_schema: {
                  name: 'analysis_result',
                  strict: true,
                  schema: ANALYSIS_RESULT_JSON_SCHEMA as unknown as Record<string, unknown>,
                },
              }
            : { type: 'json_object' },
          // gpt-5 and o-series reasoning models only accept the default temperature
          ...(/^(gpt-5|o\d)/i.test(model) ? {} : { temperature: 0.3 }),
        });

        metrics?.addLlmUsage('analysis', response.usage);
        metrics?.add('analysisLlmCalls', 1);

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('Empty response from LLM');
        }

        const result = JSON.parse(content) as LLMAnalysisResult;

        // Validate required fields
        if (!result.authorizationType || !result.feasibilityStatus) {
          throw new Error('Invalid LLM response structure: missing required fields');
        }

        // Fill in missing/invalid requirement levels and keep required in sync
        result.requiredDocuments = normalizeRequiredDocuments(result.requiredDocuments || []);

        // Validate enum values
        const validationErrors = validateLLMResponse(result as unknown as Record<string, unknown>);

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
            messages.push({ role: 'user', content: buildCorrectionPrompt(content, validationErrors) });

            // Continue to next iteration for retry
            continue;
          }
        }

        // Validation passed or corrections applied - generate suggestions
        metrics?.set('enumRetryCount', retryCount);
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
        // Model/API without Structured Outputs support: fall back to
        // json_object once, without burning a retry attempt.
        if (
          this.jsonSchemaSupported &&
          /response_format|json_schema|structured outputs?/i.test(error.message || '')
        ) {
          this.logger.warn(
            `Model ${model} rejected json_schema response_format, falling back to json_object: ${error.message}`,
          );
          this.jsonSchemaSupported = false;
          continue;
        }

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
}
