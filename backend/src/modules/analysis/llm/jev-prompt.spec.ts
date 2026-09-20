import { AnalysisInput } from '../analysis.types';
import { buildAnalysisUserPrompt } from './prompts';

const baseInput = (overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  projectType: 'OTHER',
  projectName: 'Projet',
  questionnaireResponses: {},
  pluZone: 'A',
  pluZoneLabel: 'Agricole',
  pluDocumentName: 'PLUm',
  address: null,
  floodZone: null,
  abfProtection: null,
  naturalRisks: null,
  noiseExposure: null,
  pluExtractedRules: null,
  ...overrides,
});

describe('buildAnalysisUserPrompt — jugements Jev', () => {
  it('injecte les jugements quand ils existent, et rien sinon', () => {
    const withJev = buildAnalysisUserPrompt(
      baseInput({ jevJudgments: '- Travaux sur un bâtiment existant: 95 %' }),
    );
    expect(withJev).toContain('JUGEMENTS AUTOMATIQUES COMPLÉMENTAIRES');
    expect(withJev).toContain('95 %');

    expect(buildAnalysisUserPrompt(baseInput())).not.toContain('JUGEMENTS AUTOMATIQUES');
  });
});
