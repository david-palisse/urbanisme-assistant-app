import { AnalysisInput } from '../analysis.types';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from './prompts';

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

describe('ANALYSIS_SYSTEM_PROMPT — repères nationaux', () => {
  it('impose une méthode générique, sans cas particulier codé en dur', () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Qualifie d'abord la NATURE réelle du projet");
    expect(ANALYSIS_SYSTEM_PROMPT).not.toMatch(/serre|champignon/i);
  });

  it("lit les interdictions générales avec leurs exceptions avant de conclure", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('LECTURE DES RÈGLES LOCALES : FAISABILITÉ');
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('EXPRESSÉMENT');
  });
});
