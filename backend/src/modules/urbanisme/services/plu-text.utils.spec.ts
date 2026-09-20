import {
  buildZoneScopedExcerpt,
  collectQuotes,
  detectZoneChapters,
  normalizeForQuoteCheck,
  truncateKeepingHeadAndTail,
  validateExtractedRules,
} from './plu-text.utils';

// Verbatim citations from the PLUm de Nantes Métropole (zone UM, pages 72-73)
// — the exact UMd1/UMd2 pair whose confusion caused the Carquefou bug.
const UMD1_BCS_AUTORISEE =
  "Au-delà de la bande constructible principale, il s'agit de la bande constructible secondaire dans laquelle les constructions, extensions et réhabilitations sont autorisées.";
const UMD1_RECUL =
  "Les constructions doivent être implantées en respectant un recul de 5 mètres minimum par rapport à l'emprise publique ou à la voie.";
const UMD2_BCS_INTERDITE =
  "Au-delà de cette bande constructible principale, il s'agit de la bande constructible secondaire dans laquelle les constructions nouvelles sont interdites à l'exception des annexes, des extensions limitées, des réhabilitations et des surélévations.";

const filler = (label: string, lines = 12): string =>
  Array.from(
    { length: lines },
    (_, index) =>
      `${label} — disposition détaillée numéro ${index} concernant les modalités d'application du présent règlement sur l'ensemble du territoire couvert.`,
  ).join('\n');

const REGLEMENT_FIXTURE = `PLUm — Règlement écrit
SOMMAIRE
Zone UA ......... 12
Zone UM ......... 65
Zone UP ......... 120

DISPOSITIONS GÉNÉRALES APPLICABLES
Lexique : la bande constructible principale est une bande définie au présent lexique.
${filler('Généralités')}

ZONE UA
Règle spécifique UA marqueur alpha.
${filler('Secteur UA')}

ZONE UM
B.1.1.1 Implantation par rapport aux voies
Sous-secteur UMd1
${UMD1_RECUL}
La bande constructible principale est calculée : soit à partir du recul réglementé (5 mètres maximum) ; soit à partir d'une ligne d'implantation graphique.
${UMD1_BCS_AUTORISEE}
Sous-secteur UMd2
${UMD2_BCS_INTERDITE}
${filler('Secteur UM')}

ZONE UP
Règle spécifique UP marqueur oméga.
${filler('Secteur UP')}
`;

const excerptOptions = { minChapterChars: 300, zoneBudgetChars: 80_000, generalBudgetChars: 16_000 };

describe('detectZoneChapters', () => {
  it('detects the zone chapter headings, including table-of-contents lines', () => {
    const codes = detectZoneChapters(REGLEMENT_FIXTURE).map((chapter) => chapter.code);
    expect(codes).toEqual(expect.arrayContaining(['UA', 'UM', 'UP']));
  });

  it('does not mistake ordinary sentences for headings', () => {
    const text = `Introduction\nDans la zone UM, les règles suivantes s'appliquent selon le contexte local détaillé plus loin dans le document.\n${filler('Corps')}`;
    // The "zone UM" mention is mid-sentence on a long line: no chapter.
    expect(detectZoneChapters(text)).toHaveLength(0);
  });
});

describe('buildZoneScopedExcerpt', () => {
  it('isolates the UM chapter for zone UMd1 (with both UMd1 and UMd2 paragraphs) and drops other zones', () => {
    const scoped = buildZoneScopedExcerpt(REGLEMENT_FIXTURE, 'UMd1', excerptOptions);

    expect(scoped).not.toBeNull();
    expect(scoped!.matchedChapterCode).toBe('UM');
    expect(scoped!.excerpt).toContain(UMD1_BCS_AUTORISEE);
    expect(scoped!.excerpt).toContain(UMD2_BCS_INTERDITE);
    expect(scoped!.excerpt).toContain('Lexique');
    expect(scoped!.excerpt).not.toContain('marqueur alpha');
    expect(scoped!.excerpt).not.toContain('marqueur oméga');
  });

  it('handles the PLUm de Nantes heading style: numbered headings split over two lines', () => {
    const nantesStyle = `SOMMAIRE
1.1  Dispositions applicables à la zone UM  ................................. 62
1.2 Dispositions applicables à la zone UE  .................................. 93

DISPOSITIONS GÉNÉRALES
${filler('Généralités')}
1.1 Dispositions applicables
à la zone UM
Sous-secteur UMd1
${UMD1_RECUL}
${UMD1_BCS_AUTORISEE}
Sous-secteur UMd2
${UMD2_BCS_INTERDITE}
${filler('Secteur UM')}
1.2 Dispositions applicables
à la zone UE
Règle spécifique UE marqueur epsilon.
${filler('Secteur UE')}
`;

    const scoped = buildZoneScopedExcerpt(nantesStyle, 'UMd1', excerptOptions);

    expect(scoped).not.toBeNull();
    expect(scoped!.matchedChapterCode).toBe('UM');
    expect(scoped!.excerpt).toContain(UMD1_BCS_AUTORISEE);
    expect(scoped!.excerpt).not.toContain('marqueur epsilon');
  });

  it('returns null when no chapter matches the requested zone', () => {
    expect(buildZoneScopedExcerpt(REGLEMENT_FIXTURE, 'NX', excerptOptions)).toBeNull();
  });

  it('returns null on empty input', () => {
    expect(buildZoneScopedExcerpt('', 'UMd1', excerptOptions)).toBeNull();
    expect(buildZoneScopedExcerpt(REGLEMENT_FIXTURE, '', excerptOptions)).toBeNull();
  });
});

describe('truncateKeepingHeadAndTail', () => {
  it('keeps short texts intact', () => {
    expect(truncateKeepingHeadAndTail('court', 100)).toBe('court');
  });

  it('keeps head and tail of overlong texts', () => {
    const text = `DEBUT ${'x'.repeat(5000)} FIN`;
    const truncated = truncateKeepingHeadAndTail(text, 1000);
    expect(truncated).toContain('DEBUT');
    expect(truncated).toContain('FIN');
    expect(truncated).toContain('TRUNCATED');
    expect(truncated.length).toBeLessThan(text.length);
  });
});

describe('collectQuotes', () => {
  it('collects nested quote fields with their paths', () => {
    const quotes = collectQuotes({
      rules: { implantation: { quote: 'a' } },
      exceptions: [{ quote: 'b' }, { rule: 'sans citation' }],
      constructibleBands: { quote: 'c' },
    });
    expect(quotes.map((entry) => entry.quote).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('validateExtractedRules', () => {
  it('accepts an extraction whose quotes exist verbatim (modulo whitespace/case/apostrophes)', () => {
    const rules = {
      zone: { code: 'UMd1' },
      rules: {
        implantation: {
          // Different whitespace, casing and typographic apostrophe than the source.
          quote:
            "AU-DELÀ de la bande   constructible principale, il s’agit de la bande constructible secondaire dans laquelle les constructions, extensions et réhabilitations sont autorisées.",
        },
        setbacks: { quote: UMD1_RECUL },
      },
    };

    const validation = validateExtractedRules(rules, REGLEMENT_FIXTURE, 'UMd1');
    expect(validation.ok).toBe(true);
    expect(validation.zoneOk).toBe(true);
    expect(validation.missingQuotes).toHaveLength(0);
  });

  it("rejects an extraction that attributes UMd2's rule to UMd1 via a paraphrased quote", () => {
    const rules = {
      zone: { code: 'UMd1' },
      rules: {
        footprint: {
          // The historical bug, as a quote: this sentence exists nowhere in the text.
          quote:
            'En UMd1, les constructions nouvelles sont interdites dans la bande constructible secondaire.',
        },
      },
    };

    const validation = validateExtractedRules(rules, REGLEMENT_FIXTURE, 'UMd1');
    expect(validation.ok).toBe(false);
    expect(validation.missingQuotes).toHaveLength(1);
  });

  it('rejects an extraction announcing another zone code', () => {
    const rules = {
      zone: { code: 'UMd2' },
      rules: { implantation: { quote: UMD2_BCS_INTERDITE } },
    };

    const validation = validateExtractedRules(rules, REGLEMENT_FIXTURE, 'UMd1');
    expect(validation.ok).toBe(false);
    expect(validation.zoneOk).toBe(false);
  });

  it('rejects an extraction without any quote when quotes are required', () => {
    const rules = { zone: { code: 'UMd1' }, rules: { height: { max: '9m' } } };

    expect(validateExtractedRules(rules, REGLEMENT_FIXTURE, 'UMd1').ok).toBe(false);
    expect(
      validateExtractedRules(rules, REGLEMENT_FIXTURE, 'UMd1', { requireQuotes: false }).ok,
    ).toBe(true);
  });
});

describe('validateExtractedRules — césure pdf-parse', () => {
  it('retrouve une citation déshyphénée quand le texte source coupe le mot en fin de ligne', () => {
    const hyphenatedText = `Sont délimités en zone UM, les périmètres suivants iden-\ntifiés au plan de zonage comme espaces paysagers.\n${filler('Corps')}`;
    const rules = {
      zone: { code: 'UMd1' },
      rules: {
        landscaping: {
          quote: 'les périmètres suivants identifiés au plan de zonage comme espaces paysagers',
        },
      },
    };

    const validation = validateExtractedRules(rules, hyphenatedText, 'UMd1');
    expect(validation.missingQuotes).toHaveLength(0);
    expect(validation.ok).toBe(true);
  });
});

describe('normalizeForQuoteCheck', () => {
  it('normalizes whitespace, case and typographic characters', () => {
    expect(normalizeForQuoteCheck("  L’EMPRISE   publique\n« citée »  ")).toBe(
      "l'emprise publique \" citée \"".replace(/\s+/g, ' ').trim(),
    );
  });
});

// Layout of the PLUi de la CC du Cordais et du Causse (zone UA): the chapter
// heading is the standalone line "La zone UA" (article before "zone"), followed
// by a "ZONE URBAINE / ANCIENNE (UA)" banner. The table of contents repeats the
// same lines with a trailing page number.
const PLUI_ARTICLE_FIXTURE = `PIECE 4.B : REGLEMENT ECRIT
La zone UA 19
La zone UB 23
DISPOSITIONS COMMUNES
Secteurs de protection et mise en valeur du patrimoine
${filler('Commun')}

DISPOSITIONS REGLEMENTAIRES DES
ZONES URBAINES
> Zone Urbaine – Historique (UA)
> Zone Urbaine – Récente (UB)

La zone UA
La zone UA concerne les centres anciens.
ZONE URBAINE
ANCIENNE (UA)
Règle spécifique UA marqueur alpha.
${filler('Article UA')}

La zone UB
La zone UB correspond aux extensions.
ZONE URBAINE
RECENTE (UB)
Règle spécifique UB marqueur bêta.
${filler('Article UB')}
`;

describe('detectZoneChapters — heading with a leading article', () => {
  it('detects "La zone UA" but not its table-of-contents twin ending on a page number', () => {
    const codes = detectZoneChapters(PLUI_ARTICLE_FIXTURE).map((chapter) => chapter.code);
    expect(codes).toEqual(['UA', 'UB']);
  });

  it('does not turn a "ZONE URBAINE" banner into a chapter named URBAINE', () => {
    const codes = detectZoneChapters(PLUI_ARTICLE_FIXTURE).map((chapter) => chapter.code);
    expect(codes).not.toContain('URBAINE');
  });
});

describe('buildZoneScopedExcerpt — layouts', () => {
  it('isolates UA from a règlement whose headings carry an article, and keeps the common provisions', () => {
    const scoped = buildZoneScopedExcerpt(PLUI_ARTICLE_FIXTURE, 'UA', excerptOptions);

    expect(scoped).not.toBeNull();
    expect(scoped!.matchedChapterCode).toBe('UA');
    expect(scoped!.excerpt).toContain('marqueur alpha');
    expect(scoped!.excerpt).toContain('Secteurs de protection et mise en valeur du patrimoine');
    expect(scoped!.excerpt).not.toContain('marqueur bêta');
  });

  it('falls back to tolerant headings only when the strict ones find nothing', () => {
    const text = `Règlement
Sommaire
${filler('Préambule')}

Règlement de la zone UA
Règle spécifique UA marqueur alpha.
${filler('Article UA')}

Règlement de la zone UB
Règle spécifique UB marqueur bêta.
${filler('Article UB')}
`;
    expect(detectZoneChapters(text)).toHaveLength(0);

    const scoped = buildZoneScopedExcerpt(text, 'UA', excerptOptions);
    expect(scoped).not.toBeNull();
    expect(scoped!.excerpt).toContain('marqueur alpha');
    expect(scoped!.excerpt).not.toContain('marqueur bêta');
  });

  it('accepts an all-caps banner ending on the code in parentheses when nothing else matches', () => {
    const text = `Règlement
${filler('Préambule')}

ZONE URBAINE ANCIENNE (UA)
Règle spécifique UA marqueur alpha.
${filler('Article UA')}

ZONE URBAINE RECENTE (UB)
Règle spécifique UB marqueur bêta.
${filler('Article UB')}
`;
    const scoped = buildZoneScopedExcerpt(text, 'UA', excerptOptions);
    expect(scoped).not.toBeNull();
    expect(scoped!.excerpt).toContain('marqueur alpha');
    expect(scoped!.excerpt).not.toContain('marqueur bêta');
  });

  it('still returns null when the zone appears nowhere as a heading', () => {
    expect(buildZoneScopedExcerpt(PLUI_ARTICLE_FIXTURE, 'UX', excerptOptions)).toBeNull();
  });
});
