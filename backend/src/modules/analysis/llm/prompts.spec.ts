import { AnalysisInput } from '../analysis.types';
import { buildAnalysisUserPrompt } from './prompts';

const baseInput = (overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  projectType: 'NEW_CONSTRUCTION',
  projectName: 'Maison Carquefou',
  questionnaireResponses: {},
  pluZone: 'UMd1',
  pluZoneLabel: 'Zone urbaine mixte',
  pluDocumentName: 'PLUm Nantes Métropole',
  address: { city: 'Carquefou', postCode: '44470', parcelId: null },
  floodZone: null,
  abfProtection: null,
  naturalRisks: null,
  noiseExposure: null,
  pluExtractedRules: null,
  ...overrides,
});

describe('buildAnalysisUserPrompt — bandes constructibles (fait établi)', () => {
  it('injecte la position BCS calculée pour un projet UMd1 à 25 m de la voie', () => {
    const prompt = buildAnalysisUserPrompt(
      baseInput({
        pluExtractedRules: {
          zone: { code: 'UMd1' },
          constructibleBands: {
            reculVoieMin: 5,
            bcpDepth: 17,
            bcpMeasuredFrom: 'recul',
            bcsNewConstructions: 'autorisées',
          },
        },
        questionnaireResponses: { distance_voie_publique: 25, construction_height: 6 },
      }),
    );

    expect(prompt).toContain('FAITS ÉTABLIS');
    expect(prompt).toContain('BANDE CONSTRUCTIBLE SECONDAIRE');
    expect(prompt).toContain('5 m à 22 m');
    expect(prompt).toContain("n'est PAS un motif d'incompatibilité");
  });

  it("sans bloc constructibleBands, n'injecte pas la section", () => {
    const prompt = buildAnalysisUserPrompt(
      baseInput({ pluExtractedRules: { zone: { code: 'UMd1' } } }),
    );

    expect(prompt).not.toContain('BANDES CONSTRUCTIBLES (FAITS ÉTABLIS');
  });

  it('signale explicitement un règlement local non exploité', () => {
    const prompt = buildAnalysisUserPrompt(baseInput({ pluExtractedRules: null }));

    expect(prompt).toContain("le règlement local n'a pas pu être exploité");
  });
});

describe('buildAnalysisUserPrompt — jugements Jev', () => {
  it("injecte les jugements quand ils existent, et rien sinon", () => {
    const withJev = buildAnalysisUserPrompt(
      baseInput({ jevJudgments: '- Travaux sur un bâtiment existant: 95 %' }),
    );
    expect(withJev).toContain('JUGEMENTS AUTOMATIQUES COMPLÉMENTAIRES');
    expect(withJev).toContain('95 %');

    expect(buildAnalysisUserPrompt(baseInput())).not.toContain('JUGEMENTS AUTOMATIQUES');
  });
});
