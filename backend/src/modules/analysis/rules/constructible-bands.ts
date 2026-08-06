import { AnalysisInput } from '../analysis.types';

/**
 * Deterministic reasoning on the "bandes constructibles" (BCP/BCS) extracted
 * from the règlement (`constructibleBands` block of the PLU ruleset): the
 * position of the project relative to the bands is computed in code from the
 * declared distance to the public way, then injected into the analysis prompt
 * as an established fact. The LLM comments on it, it no longer computes the
 * regulatory geometry itself (that is how UMd1 projects ended up declared
 * "hors BCP donc interdits").
 */

export interface ConstructibleBandsRule {
  reculVoieMin: number | null;
  bcpDepth: number;
  bcpMeasuredFrom: 'recul' | 'alignement' | null;
  bcsNewConstructions: string | null;
  bcsExceptions: string[];
  quote: string | null;
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

/**
 * Read the `constructibleBands` block of an extracted ruleset. Returns null
 * when the block is absent or lacks the BCP depth (nothing to compute).
 */
export function parseConstructibleBands(
  rules: Record<string, unknown> | null,
): ConstructibleBandsRule | null {
  const raw = rules?.['constructibleBands'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const block = raw as Record<string, unknown>;

  const bcpDepth = toFiniteNumber(block.bcpDepth);
  if (bcpDepth === null || bcpDepth <= 0) return null;

  const measuredFromRaw = String(block.bcpMeasuredFrom ?? '').toLowerCase();
  const bcpMeasuredFrom =
    measuredFromRaw === 'recul' || measuredFromRaw === 'alignement'
      ? (measuredFromRaw as 'recul' | 'alignement')
      : null;

  return {
    reculVoieMin: toFiniteNumber(block.reculVoieMin),
    bcpDepth,
    bcpMeasuredFrom,
    bcsNewConstructions:
      typeof block.bcsNewConstructions === 'string' && block.bcsNewConstructions.trim()
        ? block.bcsNewConstructions.trim()
        : null,
    bcsExceptions: Array.isArray(block.bcsExceptions)
      ? block.bcsExceptions.filter((item): item is string => typeof item === 'string')
      : [],
    quote: typeof block.quote === 'string' && block.quote.trim() ? block.quote : null,
  };
}

export type BandPosition = 'avant_recul' | 'bcp' | 'bcs';

export interface BandPositionResult {
  position: BandPosition;
  /** Distance from the way where the BCP starts (0 when measured from alignment). */
  bcpStart: number;
  /** Distance from the way where the BCP ends. */
  bcpEnd: number;
}

/**
 * Locate a construction relative to the bands, from its distance to the
 * public way. When the règlement computes the BCP from the regulated setback
 * ("à partir du recul réglementé"), the band spans [recul, recul + depth]
 * from the way — not [0, depth].
 */
export function computeBandPosition(
  bands: ConstructibleBandsRule,
  distanceVoie: number,
): BandPositionResult {
  const recul = bands.reculVoieMin ?? 0;
  const bcpStart = bands.bcpMeasuredFrom === 'alignement' ? 0 : recul;
  const bcpEnd = bcpStart + bands.bcpDepth;

  let position: BandPosition;
  if (distanceVoie < recul) position = 'avant_recul';
  else if (distanceVoie <= bcpEnd) position = 'bcp';
  else position = 'bcs';

  return { position, bcpStart, bcpEnd };
}

export function getDistanceVoiePublique(
  responses: Record<string, unknown> | null | undefined,
): number | null {
  return toFiniteNumber(responses?.['distance_voie_publique']);
}

const formatMeters = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');

/**
 * Build the "established facts" paragraph injected into the analysis prompt.
 * Returns null when the ruleset carries no usable `constructibleBands` block.
 */
export function buildConstructibleBandsFact(
  input: Pick<AnalysisInput, 'pluExtractedRules' | 'questionnaireResponses' | 'pluZone'>,
): string | null {
  const bands = parseConstructibleBands(input.pluExtractedRules);
  if (!bands) return null;

  const zone = input.pluZone || 'la zone';
  const lines: string[] = [];

  if (bands.reculVoieMin !== null) {
    lines.push(
      `- Recul minimal des constructions par rapport à l'emprise publique/voie : ${formatMeters(bands.reculVoieMin)} m.`,
    );
  }

  const origin =
    bands.bcpMeasuredFrom === 'alignement'
      ? "à partir de l'alignement (emprise publique/voie)"
      : bands.bcpMeasuredFrom === 'recul'
        ? 'à partir du recul réglementé (PAS depuis l\'emprise publique)'
        : "(origine de calcul non précisée dans l'extraction)";
  const geometry = computeBandPosition(bands, 0);
  lines.push(
    `- Bande constructible principale (BCP) : ${formatMeters(bands.bcpDepth)} m de profondeur, calculée ${origin} → la BCP s'étend de ${formatMeters(geometry.bcpStart)} m à ${formatMeters(geometry.bcpEnd)} m de la voie.`,
  );

  if (bands.bcsNewConstructions) {
    lines.push(
      `- Règle du règlement pour la bande constructible secondaire (BCS) en ${zone} : constructions nouvelles ${bands.bcsNewConstructions}.` +
        (bands.bcsExceptions.length > 0
          ? ` Exceptions admises en BCS : ${bands.bcsExceptions.join(', ')}.`
          : ''),
    );
  } else {
    lines.push(
      `- Le régime des constructions nouvelles en BCS pour ${zone} n'a pas pu être extrait de manière vérifiable : ne conclus PAS à une interdiction ni à une incompatibilité pour ce motif — indique seulement que ce point précis est à confirmer auprès du service urbanisme.`,
    );
  }
  if (bands.quote) {
    lines.push(`- Citation du règlement : « ${bands.quote} »`);
  }

  const distanceVoie = getDistanceVoiePublique(input.questionnaireResponses);
  if (distanceVoie !== null) {
    const { position, bcpStart, bcpEnd } = computeBandPosition(bands, distanceVoie);
    const positionText =
      position === 'bcs'
        ? `le projet se situe en BANDE CONSTRUCTIBLE SECONDAIRE (BCS), au-delà de la BCP (${formatMeters(bcpStart)}–${formatMeters(bcpEnd)} m)`
        : position === 'bcp'
          ? `le projet se situe en BANDE CONSTRUCTIBLE PRINCIPALE (BCP, ${formatMeters(bcpStart)}–${formatMeters(bcpEnd)} m)`
          : `le projet est implanté EN AVANT du recul minimal de ${formatMeters(bands.reculVoieMin ?? 0)} m — non conforme au recul imposé`;
    lines.push(
      `- Distance déclarée du projet à la voie publique : ${formatMeters(distanceVoie)} m → ${positionText}.`,
    );
    if (position === 'bcs' && /autoris/i.test(bands.bcsNewConstructions || '')) {
      lines.push(
        `- CONSÉQUENCE : la position en BCS n'est PAS un motif d'incompatibilité en ${zone} (les constructions y sont autorisées par le règlement). Applique les règles propres à la BCS (retraits, hauteur...), sans remettre en cause la constructibilité.`,
      );
    }
  } else {
    lines.push(
      '- Distance du projet à la voie publique non renseignée dans le questionnaire : la position BCP/BCS ne peut pas être établie.',
    );
  }

  lines.push(
    'Ces éléments sont calculés de manière déterministe par le système à partir du règlement extrait : considère-les comme des FAITS ÉTABLIS. Ne recalcule pas la position BCP/BCS et ne la contredis pas.',
  );

  return lines.join('\n');
}
