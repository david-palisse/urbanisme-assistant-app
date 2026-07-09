import { LLMAnalysisResult } from '../analysis.types';
import {
  applyAttestationRules,
  applyNoiseExposureRules,
  normalizeRequiredDocuments,
  parseSeismicZone,
  AttestationRuleInput,
} from './post-processing';

const baseResult = (overrides: Partial<LLMAnalysisResult> = {}): LLMAnalysisResult => ({
  authorizationType: 'PC',
  feasibilityStatus: 'compatible',
  summary: 'Résumé',
  constraints: [],
  requiredDocuments: [],
  ...overrides,
});

const baseInput = (overrides: Partial<AttestationRuleInput> = {}): AttestationRuleInput => ({
  projectType: 'NEW_CONSTRUCTION',
  naturalRisks: null,
  floodZone: null,
  ...overrides,
});

describe('parseSeismicZone', () => {
  it('parses plain and free-form zone strings', () => {
    expect(parseSeismicZone('3')).toBe(3);
    expect(parseSeismicZone('Zone 3')).toBe(3);
    expect(parseSeismicZone('Zone de sismicité modérée (3)')).toBe(3);
  });

  it('returns null for missing or unparseable values', () => {
    expect(parseSeismicZone(null)).toBeNull();
    expect(parseSeismicZone(undefined)).toBeNull();
    expect(parseSeismicZone('inconnue')).toBeNull();
  });
});

describe('normalizeRequiredDocuments', () => {
  it('derives requirement from required for legacy documents', () => {
    const docs = normalizeRequiredDocuments([
      { code: 'DP1', name: 'Plan de situation', description: '', required: true },
      { code: 'DP6', name: 'Insertion', description: '', required: false },
    ]);

    expect(docs[0].requirement).toBe('obligatoire');
    expect(docs[1].requirement).toBe('conditionnel');
  });

  it('resyncs required from requirement', () => {
    const docs = normalizeRequiredDocuments([
      {
        code: 'DP8',
        name: 'Plan cadastral',
        description: '',
        required: true,
        requirement: 'optionnel',
      },
    ]);

    expect(docs[0].required).toBe(false);
  });
});

describe('applyAttestationRules — parasismique (PCMI13)', () => {
  it.each(['3', 'Zone 3 - modérée'])('pushes PCMI13 for PC in seismic zone "%s"', (zone) => {
    const result = applyAttestationRules(
      baseResult(),
      baseInput({ naturalRisks: { seismicZone: zone, clayRisk: null } }),
    );

    const doc = result.requiredDocuments.find((d) => d.code === 'PCMI13');
    expect(doc).toBeDefined();
    expect(doc?.requirement).toBe('obligatoire');
    expect(doc?.required).toBe(true);
  });

  it.each([
    ['zone 1', { seismicZone: '1', clayRisk: null }],
    ['zone nulle', null],
    ['zone imparsable', { seismicZone: 'inconnue', clayRisk: null }],
  ])('does not push PCMI13 for %s', (_label, naturalRisks) => {
    const result = applyAttestationRules(baseResult(), baseInput({ naturalRisks }));

    expect(result.requiredDocuments.find((d) => d.code === 'PCMI13')).toBeUndefined();
  });

  it('does not push PCMI13 for a DP', () => {
    const result = applyAttestationRules(
      baseResult({ authorizationType: 'DP' }),
      baseInput({ naturalRisks: { seismicZone: '4', clayRisk: null } }),
    );

    expect(result.requiredDocuments.find((d) => d.code === 'PCMI13')).toBeUndefined();
  });

  it('does not duplicate when the LLM already emitted a parasismique document', () => {
    const result = applyAttestationRules(
      baseResult({
        requiredDocuments: [
          {
            code: 'DOC_X',
            name: 'Attestation parasismique',
            description: '',
            required: true,
            requirement: 'obligatoire',
          },
        ],
      }),
      baseInput({ naturalRisks: { seismicZone: '3', clayRisk: null } }),
    );

    const matches = result.requiredDocuments.filter((d) =>
      d.name.toLowerCase().includes('parasismique'),
    );
    expect(matches).toHaveLength(1);
    expect(result.requiredDocuments.find((d) => d.code === 'PCMI13')).toBeUndefined();
  });
});

describe('applyAttestationRules — RE2020 (PCMI14-1)', () => {
  it('pushes an obligatoire attestation for a new construction', () => {
    const result = applyAttestationRules(baseResult(), baseInput());

    const doc = result.requiredDocuments.find((d) => d.code === 'PCMI14-1');
    expect(doc?.requirement).toBe('obligatoire');
    expect(doc?.required).toBe(true);
  });

  it('pushes a conditionnel attestation for an extension', () => {
    const result = applyAttestationRules(baseResult(), baseInput({ projectType: 'EXTENSION' }));

    const doc = result.requiredDocuments.find((d) => d.code === 'PCMI14-1');
    expect(doc?.requirement).toBe('conditionnel');
    expect(doc?.required).toBe(false);
  });

  it('does not push an attestation for a pool', () => {
    const result = applyAttestationRules(baseResult(), baseInput({ projectType: 'POOL' }));

    expect(result.requiredDocuments.find((d) => d.code === 'PCMI14-1')).toBeUndefined();
  });

  it('does not duplicate when the LLM already emitted a RE2020 document', () => {
    const result = applyAttestationRules(
      baseResult({
        requiredDocuments: [
          {
            code: 'PCMI14',
            name: 'Attestation RE2020',
            description: '',
            required: true,
            requirement: 'obligatoire',
          },
        ],
      }),
      baseInput(),
    );

    expect(result.requiredDocuments.find((d) => d.code === 'PCMI14-1')).toBeUndefined();
  });
});

describe('applyAttestationRules — PPR', () => {
  it('pushes a conditionnel PPR attestation when a PPR flood zone applies', () => {
    const result = applyAttestationRules(
      baseResult(),
      baseInput({
        floodZone: {
          isInFloodZone: true,
          zoneType: 'bleu',
          riskLevel: 'moyen',
          sourceName: 'PPRI Loire aval',
          description: null,
        },
      }),
    );

    const doc = result.requiredDocuments.find((d) => d.code === 'ATTEST_PPR');
    expect(doc?.requirement).toBe('conditionnel');
    expect(doc?.description).toContain('PPRI Loire aval');
  });

  it('does not push a PPR attestation outside a flood zone', () => {
    const result = applyAttestationRules(baseResult(), baseInput());

    expect(result.requiredDocuments.find((d) => d.code === 'ATTEST_PPR')).toBeUndefined();
  });
});

describe('applyNoiseExposureRules (regression)', () => {
  it('still pushes the acoustic attestation in PEB zone D, now with a requirement level', () => {
    const result = applyNoiseExposureRules(baseResult(), {
      projectType: 'NEW_CONSTRUCTION',
      projectName: 'Test',
      questionnaireResponses: {},
      pluZone: null,
      pluZoneLabel: null,
      pluDocumentName: null,
      address: null,
      floodZone: null,
      abfProtection: null,
      naturalRisks: null,
      noiseExposure: {
        isInNoiseZone: true,
        zone: 'D',
        airportName: 'Nantes Atlantique',
        airportCode: 'LFRS',
        restrictions: null,
      },
      pluExtractedRules: null,
    });

    const doc = result.requiredDocuments.find((d) => d.code === 'ATTEST_ACOUSTIQUE');
    expect(doc?.requirement).toBe('obligatoire');
    expect(result.feasibilityStatus).toBe('compatible_a_risque');
  });
});
