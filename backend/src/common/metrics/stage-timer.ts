/**
 * Collects named stage durations and free-form metric values for one
 * pipeline run (analysis, extraction, benchmark...). Cheap and allocation
 * light so it can be passed down through services as an optional parameter.
 */
export class StageTimer {
  private readonly durationsMs: Record<string, number> = {};
  private readonly values: Record<string, unknown> = {};

  /** Time an async stage. Re-entrant: durations for the same stage accumulate. */
  async time<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.durationsMs[stage] = (this.durationsMs[stage] || 0) + (Date.now() - start);
    }
  }

  /** Record an arbitrary metric value (cache hit flag, model name...). */
  set(key: string, value: unknown): void {
    this.values[key] = value;
  }

  /** Increment a numeric counter (retries, tokens...). */
  add(key: string, by: number): void {
    this.values[key] = ((this.values[key] as number) || 0) + by;
  }

  /** Merge OpenAI usage into prompt/completion token counters. */
  addLlmUsage(prefix: string, usage: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } | null | undefined): void {
    if (!usage) return;
    this.add(`${prefix}PromptTokens`, usage.prompt_tokens ?? usage.input_tokens ?? 0);
    this.add(`${prefix}CompletionTokens`, usage.completion_tokens ?? usage.output_tokens ?? 0);
  }

  snapshot(): Record<string, unknown> {
    return { stagesMs: { ...this.durationsMs }, ...this.values };
  }
}
