import {
  buildConstructibleBandsFact,
  computeBandPosition,
  parseConstructibleBands,
  getDistanceVoiePublique,
} from './constructible-bands';

// Ruleset UMd1 conforme au règlement du PLUm de Nantes Métropole (pages 72-73):
// recul 5 m, BCP de 17 m calculée à partir du recul (donc 5 → 22 m de la voie),
// constructions nouvelles autorisées en BCS.
const UMD1_QUOTE =
  "Au-delà de la bande constructible principale, il s'agit de la bande constructible secondaire dans laquelle les constructions, extensions et réhabilitations sont autorisées.";

const umd1Ruleset = (): Record<string, unknown> => ({
  zone: { code: 'UMd1' },
  constructibleBands: {
    reculVoieMin: 5,
    bcpDepth: 17,
    bcpMeasuredFrom: 'recul',
    bcsNewConstructions: 'autorisées',
    bcsExceptions: [],
    quote: UMD1_QUOTE,
  },
});

describe('parseConstructibleBands', () => {
  it('parses the block, including numbers serialized as strings', () => {
    const bands = parseConstructibleBands({
      constructibleBands: {
        reculVoieMin: '5',
        bcpDepth: '17',
        bcpMeasuredFrom: 'recul',
        bcsNewConstructions: 'autorisées',
      },
    });

    expect(bands).toMatchObject({ reculVoieMin: 5, bcpDepth: 17, bcpMeasuredFrom: 'recul' });
  });

  it('returns null without a usable BCP depth or without the block', () => {
    expect(parseConstructibleBands(null)).toBeNull();
    expect(parseConstructibleBands({})).toBeNull();
    expect(parseConstructibleBands({ constructibleBands: { reculVoieMin: 5 } })).toBeNull();
  });
});

describe('computeBandPosition — zone UMd1 (BCP 17 m à partir du recul de 5 m)', () => {
  const bands = parseConstructibleBands(umd1Ruleset())!;

  it('la BCP couvre 5 → 22 m de la voie (pas 0 → 17 m)', () => {
    const { bcpStart, bcpEnd } = computeBandPosition(bands, 10);
    expect(bcpStart).toBe(5);
    expect(bcpEnd).toBe(22);
  });

  it('cas 1 du ticket: projet à 25 m de la voie → BCS', () => {
    expect(computeBandPosition(bands, 25).position).toBe('bcs');
  });

  it('cas 2 du ticket: projet à 24 m de la voie → BCS', () => {
    expect(computeBandPosition(bands, 24).position).toBe('bcs');
  });

  it('à 10 m ou en limite de bande (22 m) → BCP', () => {
    expect(computeBandPosition(bands, 10).position).toBe('bcp');
    expect(computeBandPosition(bands, 22).position).toBe('bcp');
  });

  it('à moins de 5 m → en avant du recul', () => {
    expect(computeBandPosition(bands, 3).position).toBe('avant_recul');
  });

  it('mesurée depuis l\'alignement, la BCP couvre 0 → 17 m', () => {
    const alignementBands = { ...bands, bcpMeasuredFrom: 'alignement' as const };
    expect(computeBandPosition(alignementBands, 10)).toMatchObject({ bcpStart: 0, bcpEnd: 17 });
    expect(computeBandPosition(alignementBands, 20).position).toBe('bcs');
  });
});

describe('getDistanceVoiePublique', () => {
  it('parses numbers and numeric strings, tolerates missing values', () => {
    expect(getDistanceVoiePublique({ distance_voie_publique: 25 })).toBe(25);
    expect(getDistanceVoiePublique({ distance_voie_publique: '24,5' })).toBe(24.5);
    expect(getDistanceVoiePublique({})).toBeNull();
    expect(getDistanceVoiePublique(null)).toBeNull();
  });
});

describe('buildConstructibleBandsFact — cas du ticket UMd1', () => {
  it('cas 1 (25 m de la voie): position BCS établie, constructibilité non remise en cause', () => {
    const fact = buildConstructibleBandsFact({
      pluExtractedRules: umd1Ruleset(),
      questionnaireResponses: { distance_voie_publique: 25, construction_height: 6 },
      pluZone: 'UMd1',
    });

    expect(fact).not.toBeNull();
    expect(fact).toContain('5 m à 22 m');
    expect(fact).toContain('BANDE CONSTRUCTIBLE SECONDAIRE');
    expect(fact).toContain('constructions nouvelles autorisées');
    expect(fact).toContain("n'est PAS un motif d'incompatibilité");
    expect(fact).toContain('FAITS ÉTABLIS');
  });

  it('cas 2 (24 m de la voie): position BCS établie', () => {
    const fact = buildConstructibleBandsFact({
      pluExtractedRules: umd1Ruleset(),
      questionnaireResponses: { distance_voie_publique: 24, construction_height: 8 },
      pluZone: 'UMd1',
    });

    expect(fact).toContain('BANDE CONSTRUCTIBLE SECONDAIRE');
    expect(fact).toContain("n'est PAS un motif d'incompatibilité");
  });

  it('sans distance à la voie: décrit les bandes sans conclure sur la position', () => {
    const fact = buildConstructibleBandsFact({
      pluExtractedRules: umd1Ruleset(),
      questionnaireResponses: {},
      pluZone: 'UMd1',
    });

    expect(fact).toContain('5 m à 22 m');
    expect(fact).toContain('non renseignée');
    expect(fact).not.toContain('BANDE CONSTRUCTIBLE SECONDAIRE (BCS), au-delà');
  });

  it('sans bloc constructibleBands: null (aucune injection dans le prompt)', () => {
    expect(
      buildConstructibleBandsFact({
        pluExtractedRules: { zone: { code: 'UMd1' } },
        questionnaireResponses: { distance_voie_publique: 25 },
        pluZone: 'UMd1',
      }),
    ).toBeNull();
  });
});
