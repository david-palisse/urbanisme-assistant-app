import { AnalysisResult } from '@prisma/client';
import { FREE_SUMMARY_WORDS } from './packs';

export interface LockedCounts {
  constraints: number;
  requiredDocuments: number;
  suggestions: number;
}

/**
 * Server-side gating of an analysis result. The free tier only receives the
 * feasibility status and the first FREE_SUMMARY_WORDS words of the summary;
 * everything else (authorization type, constraints, documents, suggestions,
 * raw LLM response) is stripped so it can't be read from the API response,
 * only counts are kept to tease the locked content.
 */
export function presentAnalysisResult(
  result: AnalysisResult | null,
  unlocked: boolean,
) {
  if (!result) {
    return result;
  }

  if (unlocked) {
    return { ...result, isLocked: false };
  }

  const words = (result.summary ?? '').split(/\s+/).filter(Boolean);
  const summaryPreview = words.slice(0, FREE_SUMMARY_WORDS).join(' ');

  let suggestionsCount = 0;
  if (result.llmResponse) {
    try {
      const parsed = JSON.parse(result.llmResponse) as {
        suggestions?: unknown[];
      };
      suggestionsCount = parsed?.suggestions?.length ?? 0;
    } catch {
      // llmResponse is only used for the teaser count
    }
  }

  const lockedCounts: LockedCounts = {
    constraints: Array.isArray(result.constraints)
      ? result.constraints.length
      : 0,
    requiredDocuments: Array.isArray(result.requiredDocuments)
      ? result.requiredDocuments.length
      : 0,
    suggestions: suggestionsCount,
  };

  return {
    id: result.id,
    projectId: result.projectId,
    authorizationType: null,
    constraints: [],
    requiredDocuments: [],
    llmResponse: null,
    feasibilityStatus: result.feasibilityStatus,
    summary: summaryPreview,
    summaryTruncated: words.length > FREE_SUMMARY_WORDS,
    createdAt: result.createdAt,
    isLocked: true,
    lockedCounts,
  };
}
