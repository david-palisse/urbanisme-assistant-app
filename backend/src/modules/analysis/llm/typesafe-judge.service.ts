import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AnalysisInput } from '../analysis.types';
import { StageTimer } from '../../../common/metrics/stage-timer';

const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const REQUEST_TIMEOUT_MS = 8000;
/** Cap on rule entries judged in one request (one Noul each, all in parallel) */
const MAX_RULE_QUESTIONS = 30;

/** Probability above which a judgment is presented as "likely" to the analyzer */
const LIKELY = 0.6;
/** Probability below which a judgment is presented as "unlikely" */
const UNLIKELY = 0.2;

interface NoulAnswer {
  type: 'noul';
  noul: number;
}

/**
 * Project-level yes/no judgments. Instructions are in English, the language
 * where Jev is most accurate; the state (the user's own words) stays French.
 */
const PROJECT_QUESTIONS: Record<string, { label: string; instructions: string }> = {
  worksOnExistingBuilding: {
    label: 'Travaux sur un bâtiment existant (réhabilitation, transformation)',
    instructions:
      'The project consists of works on an already existing building (renovation, rehabilitation, conversion), not the construction of a new building or structure.',
  },
  createsNewBuilding: {
    label: 'Création d\'une construction nouvelle',
    instructions:
      'The project creates a new building or structure that does not exist yet on the plot.',
  },
  changesUseOfExistingBuilding: {
    label: 'Changement d\'usage ou de destination d\'un bâtiment existant',
    instructions:
      'The project changes the use or purpose of an existing building, or adds usable floor area inside or to an existing building.',
  },
  changesStructureOrFacade: {
    label: 'Modification de la structure porteuse ou des façades',
    instructions:
      'The project modifies the load-bearing structure or the exterior facades (openings, cladding) of an existing building.',
  },
  isLightweightOrRemovable: {
    label: 'Structure légère, démontable ou saisonnière',
    instructions:
      'The project is a lightweight, removable or seasonal structure, without heavy foundations and not designed to be closed, insulated or permanently occupied.',
  },
  isEnclosedPermanentBuilding: {
    label: 'Bâtiment durable, fermé ou aménagé pour une occupation ou une activité permanente',
    instructions:
      'The project is a permanent building that is enclosed and fitted out for a lasting occupation or activity (insulated, heated, equipped or on foundations).',
  },
};

export interface JevJudgments {
  /** Text block injected in the analysis prompt */
  promptSection: string;
  /** Raw probabilities, kept for metrics/debugging */
  projectProbabilities: Record<string, number>;
  questionCount: number;
}

interface RuleEntry {
  id: string;
  source: 'exceptions' | 'landUse';
  appliesTo: string;
  description: string;
}

/** Collect the project-specific entries (exceptions and land-use) of a ruleset. */
export function collectRuleEntries(
  rules: Record<string, unknown> | null,
): RuleEntry[] {
  if (!rules) return [];
  const entries: RuleEntry[] = [];

  const exceptions = Array.isArray(rules.exceptions) ? rules.exceptions : [];
  exceptions.forEach((entry, index) => {
    const item = entry as Record<string, unknown>;
    if (!item?.appliesTo) return;
    entries.push({
      id: `rule_exception_${index}`,
      source: 'exceptions',
      appliesTo: String(item.appliesTo),
      description: String(item.rule ?? ''),
    });
  });

  const landUse = (rules.landUse as { entries?: unknown[] } | undefined)?.entries;
  (Array.isArray(landUse) ? landUse : []).forEach((entry, index) => {
    const item = entry as Record<string, unknown>;
    if (!item?.appliesTo) return;
    const status = item.status ? `${String(item.status)}` : '';
    const conditions = item.conditions ? ` — conditions: ${String(item.conditions)}` : '';
    entries.push({
      id: `rule_landuse_${index}`,
      source: 'landUse',
      appliesTo: String(item.appliesTo),
      description: `${status}${conditions}`.trim(),
    });
  });

  return entries.slice(0, MAX_RULE_QUESTIONS);
}

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Turn raw Noul probabilities into the text block given to the analyzer. */
export function formatJudgments(
  projectProbabilities: Record<string, number>,
  ruleProbabilities: Array<{ entry: RuleEntry; probability: number }>,
): string {
  const lines: string[] = [];

  for (const [key, { label }] of Object.entries(PROJECT_QUESTIONS)) {
    const probability = projectProbabilities[key];
    if (typeof probability === 'number') {
      lines.push(`- ${label}: ${percent(probability)}`);
    }
  }

  const likely = ruleProbabilities.filter(({ probability }) => probability >= LIKELY);
  const unlikely = ruleProbabilities.filter(({ probability }) => probability <= UNLIKELY);

  const ruleLine = ({ entry, probability }: (typeof ruleProbabilities)[number]) =>
    `  • [${entry.source}] ${entry.appliesTo}${entry.description ? ` — ${entry.description}` : ''} (${percent(probability)})`;

  const sections: string[] = [
    'Probabilités estimées par un modèle spécialisé (indicatives, à recouper avec les règles et le questionnaire; un jugement à 40-60 % est incertain):',
    ...lines,
  ];
  if (likely.length > 0) {
    sections.push(
      'Règles spécifiques du règlement probablement APPLICABLES à ce projet:',
      ...likely.map(ruleLine),
    );
  }
  if (unlikely.length > 0) {
    sections.push(
      'Règles spécifiques du règlement probablement NON applicables à ce projet:',
      ...unlikely.map(ruleLine),
    );
  }
  return sections.join('\n');
}

/**
 * Fast structured judgments from TypeSafe's Jev model (yes/no probabilities),
 * used as a complement to the GPT analysis: they qualify the nature of the
 * project and which of the zone's specific rules apply, instead of leaving
 * those semantic calls implicit in a long prompt.
 *
 * Fully optional: without TYPESAFE_API_KEY, or on any error, it returns null
 * and the analysis proceeds exactly as before.
 */
@Injectable()
export class TypeSafeJudgeService {
  private readonly logger = new Logger(TypeSafeJudgeService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  isEnabled(): boolean {
    return !!this.configService.get<string>('typesafe.apiKey');
  }

  async judgeProject(
    input: AnalysisInput,
    metrics?: StageTimer,
  ): Promise<JevJudgments | null> {
    const apiKey = this.configService.get<string>('typesafe.apiKey');
    if (!apiKey) return null;

    const ruleEntries = collectRuleEntries(input.pluExtractedRules);

    const questions: Record<string, unknown> = {};
    for (const [key, { instructions }] of Object.entries(PROJECT_QUESTIONS)) {
      questions[key] = { type: 'noul', instructions };
    }
    for (const entry of ruleEntries) {
      questions[entry.id] = {
        type: 'noul',
        instructions: {
          question:
            'Does this local planning rule apply to the project described in the state? Answer yes only if the rule concerns this kind of project or works, and its conditions are met by what the state says.',
          rule: {
            concerns: entry.appliesTo,
            details: entry.description,
          },
        },
      };
    }

    const state = {
      project_type: input.projectType,
      project_name: input.projectName,
      planning_zone: input.pluZoneLabel
        ? `${input.pluZone} (${input.pluZoneLabel})`
        : input.pluZone,
      protected_heritage_area: !!input.abfProtection?.isProtected,
      answers: input.questionnaireResponses,
    };

    try {
      const response = await (metrics
        ? metrics.time('jevJudgments', () => this.post(apiKey, state, questions))
        : this.post(apiKey, state, questions));

      const answers = (response?.answers ?? {}) as Record<string, NoulAnswer>;
      const probabilityOf = (id: string): number | undefined => {
        const answer = answers[id];
        return answer && answer.type === 'noul' && typeof answer.noul === 'number'
          ? answer.noul
          : undefined;
      };

      const projectProbabilities: Record<string, number> = {};
      for (const key of Object.keys(PROJECT_QUESTIONS)) {
        const probability = probabilityOf(key);
        if (probability !== undefined) projectProbabilities[key] = probability;
      }

      const ruleProbabilities = ruleEntries.flatMap((entry) => {
        const probability = probabilityOf(entry.id);
        return probability === undefined ? [] : [{ entry, probability }];
      });

      metrics?.set('jevQuestions', Object.keys(questions).length);
      metrics?.set('jevInputTokens', response?.usage?.input_tokens ?? null);

      if (
        Object.keys(projectProbabilities).length === 0 &&
        ruleProbabilities.length === 0
      ) {
        return null;
      }

      return {
        promptSection: formatJudgments(projectProbabilities, ruleProbabilities),
        projectProbabilities,
        questionCount: Object.keys(questions).length,
      };
    } catch (error) {
      this.logger.warn(`TypeSafe judgments skipped: ${error.message}`);
      metrics?.set('jevError', error.message);
      return null;
    }
  }

  private async post(
    apiKey: string,
    state: unknown,
    questions: Record<string, unknown>,
  ): Promise<{ answers?: unknown; usage?: { input_tokens?: number } }> {
    const response = await firstValueFrom(
      this.httpService.post(
        TYPESAFE_ENDPOINT,
        { state, model: 'jev-latest', questions },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      ),
    );
    return response.data;
  }
}
