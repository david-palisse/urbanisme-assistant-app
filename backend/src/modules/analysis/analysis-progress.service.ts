import { Injectable } from '@nestjs/common';

export interface AnalysisProgress {
  step: number;
  totalSteps: number;
  label: string;
}

/** Steps reported to the user while an analysis runs, in execution order */
export const ANALYSIS_STEPS = [
  "Récupération du plan local d'urbanisme et envoi à l'agent extracteur",
  "Extraction des règles du plan local d'urbanisme par l'agent",
  "Envoi des règles extraites et des informations du projet à l'agent analyseur",
  "Récupération et affichage des résultats d'analyse",
] as const;

/**
 * Tracks the current step of in-flight analyses so the frontend can poll
 * progress while the analyze request is running. State is in-memory only:
 * an analysis runs entirely within one request on one instance, and the
 * progress is meaningless once the request has completed.
 */
@Injectable()
export class AnalysisProgressService {
  private readonly progressByProject = new Map<string, AnalysisProgress>();

  setStep(projectId: string, step: number) {
    this.progressByProject.set(projectId, {
      step,
      totalSteps: ANALYSIS_STEPS.length,
      label: ANALYSIS_STEPS[step - 1],
    });
  }

  get(projectId: string): AnalysisProgress | null {
    return this.progressByProject.get(projectId) ?? null;
  }

  clear(projectId: string) {
    this.progressByProject.delete(projectId);
  }
}
