import {
  AnalysisProgressService,
  ANALYSIS_STEPS,
} from './analysis-progress.service';

describe('AnalysisProgressService', () => {
  let service: AnalysisProgressService;

  beforeEach(() => {
    service = new AnalysisProgressService();
  });

  it('returns null when no analysis is running', () => {
    expect(service.get('project-1')).toBeNull();
  });

  it('reports the current step with its label', () => {
    service.setStep('project-1', 2);

    expect(service.get('project-1')).toEqual({
      step: 2,
      totalSteps: ANALYSIS_STEPS.length,
      label: ANALYSIS_STEPS[1],
    });
  });

  it('tracks projects independently', () => {
    service.setStep('project-1', 1);
    service.setStep('project-2', 3);

    expect(service.get('project-1')?.step).toBe(1);
    expect(service.get('project-2')?.step).toBe(3);
  });

  it('clears the progress once the analysis is over', () => {
    service.setStep('project-1', 4);
    service.clear('project-1');

    expect(service.get('project-1')).toBeNull();
  });
});
