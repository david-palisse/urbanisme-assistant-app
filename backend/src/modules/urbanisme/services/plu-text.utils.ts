/**
 * Pure text utilities for the per-zone PLU extraction pipeline:
 * - locate the chapter of a given zone inside the règlement text (pdf-parse
 *   output) so the extraction LLM only receives the relevant sections;
 * - validate an extraction a posteriori (verbatim quotes present in the
 *   source text, zone code matching the requested zone).
 *
 * Kept free of Nest/IO dependencies so they are trivially unit-testable.
 */

export interface ZoneChapter {
  /** Zone code as written in the heading (e.g. "UM", "1AU"). */
  code: string;
  /** Char offset of the heading line in the source text. */
  start: number;
  /** Char offset of the next detected heading (or end of text). */
  end: number;
}

/**
 * A candidate zone code token: optional leading digits (1AU, 2AUh...), then an
 * uppercase letter, then a short alphanumeric tail (UM, UMd1, UBb, Nl...).
 */
const ZONE_CODE_SHAPE = /^[0-9]{0,2}[A-Z][A-Za-z0-9]{0,7}$/;

/**
 * Heading line announcing a zone chapter. Matches the common GPU règlement
 * styles: "Zone UM", "ZONE UM", "Chapitre 2 : zone UM", "Dispositions
 * applicables à la zone UM". Lines ending with a page number ("Zone UM ... 65")
 * are table-of-contents entries, not chapter starts, and must NOT match: a
 * phantom chapter starting in the sommaire would swallow the dispositions
 * générales under the wrong zone code.
 */
const ZONE_HEADING_LINE =
  /^(?:(?:chapitre|titre|section)\s+[0-9IVXLC]+\s*[:.\-–—]?\s*|[0-9]{1,2}(?:\.[0-9]{1,2})*\.?\s+)?(?:dispositions?\s+(?:particuli[eè]res?\s+)?(?:applicables?\s+)?(?:[àa]|en|aux|dans|de)\s+(?:la\s+|les\s+)?zones?\s+|zones?\s+)([^\s:.\-–—]{1,10})[\s:.\-–—·…]*$/i;

/**
 * pdf-parse frequently splits a chapter banner over two lines
 * ("1.1 Dispositions applicables" / "à la zone UM" in the PLUm de Nantes):
 * a line ending on "dispositions applicables" is a candidate first half.
 */
const SPLIT_HEADING_FIRST_LINE = /(?:^|\s)dispositions?\s+applicables?$/i;

/** Extract the zone code from a candidate heading line, or null. */
function headingZoneCode(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return null;

  const match = trimmed.match(ZONE_HEADING_LINE);
  if (match) {
    const code = match[1].replace(/[.,;:]+$/, '');
    if (ZONE_CODE_SHAPE.test(code)) return code;
  }

  // No looser fallback (e.g. "all-caps line ending with a code"): on real
  // règlements it promotes ordinary section titles ("USAGES DES SOLS ET
  // NATURES D'ACTIVITÉS") to phantom chapters that truncate the zone chapter.
  // When nothing matches, the caller falls back to whole-document extraction.
  return null;
}

/**
 * Scan the règlement text for zone chapter headings. Repeated page headers
 * ("Zone UM" on every page) produce several consecutive chapters with the
 * same code; callers reassemble them by concatenating same-code chapters.
 */
export function detectZoneChapters(text: string): ZoneChapter[] {
  const headings: Array<{ code: string; offset: number }> = [];
  const lines = text.split('\n');

  let offset = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    let code = headingZoneCode(line);
    if (!code && index + 1 < lines.length && SPLIT_HEADING_FIRST_LINE.test(line.trim())) {
      code = headingZoneCode(`${line.trim()} ${lines[index + 1].trim()}`);
    }
    if (code) headings.push({ code, offset });
    offset += line.length + 1;
  }

  return headings.map((heading, index) => ({
    code: heading.code,
    start: heading.offset,
    end: index + 1 < headings.length ? headings[index + 1].offset : text.length,
  }));
}

/** Keep the head and tail of an overlong text (zone articles often sit late). */
export function truncateKeepingHeadAndTail(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = maxChars - headSize;

  const head = text.slice(0, headSize);
  const tail = text.slice(-tailSize);

  return `${head}\n\n[...TRUNCATED ${text.length - maxChars} CHARS...]\n\n${tail}`;
}

export interface ZoneScopedExcerpt {
  /** Text to hand to the extraction LLM (labelled sections). */
  excerpt: string;
  /** Chapter code that matched the requested zone (e.g. "UM" for "UMd1"). */
  matchedChapterCode: string;
  /** Size of the full zone chapter before truncation. */
  zoneChapterChars: number;
}

export interface ZoneScopedExcerptOptions {
  /** Max chars kept for the zone chapter itself. */
  zoneBudgetChars?: number;
  /** Max chars kept for the general provisions / lexicon context. */
  generalBudgetChars?: number;
  /** Chapters smaller than this are table-of-contents noise, not chapters. */
  minChapterChars?: number;
}

/**
 * Build the excerpt sent to the extraction LLM for a given zone: the full
 * chapter of the zone (longest chapter code that prefixes the requested zone
 * code, e.g. chapter "UM" for zone "UMd1") plus a budgeted slice of what
 * precedes it (dispositions générales, lexique). Returns null when no chapter
 * matches, in which case the caller falls back to whole-document extraction.
 */
export function buildZoneScopedExcerpt(
  text: string,
  zoneCode: string,
  options: ZoneScopedExcerptOptions = {},
): ZoneScopedExcerpt | null {
  const {
    zoneBudgetChars = 100_000,
    generalBudgetChars = 16_000,
    minChapterChars = 4_000,
  } = options;

  if (!text || !zoneCode) return null;

  const chapters = detectZoneChapters(text).filter(
    (chapter) => chapter.end - chapter.start >= minChapterChars,
  );
  if (chapters.length === 0) return null;

  const target = zoneCode.trim().toLowerCase();
  let bestCode: string | null = null;
  for (const chapter of chapters) {
    const code = chapter.code.toLowerCase();
    if (target.startsWith(code) && (!bestCode || code.length > bestCode.length)) {
      bestCode = code;
    }
  }
  if (!bestCode) return null;

  const matching = chapters.filter((chapter) => chapter.code.toLowerCase() === bestCode);
  const zoneText = matching.map((chapter) => text.slice(chapter.start, chapter.end)).join('\n');
  // General provisions / lexicon live before the first zone chapter; other
  // zones' chapters are deliberately excluded (their rules must never leak
  // into the context of the requested zone).
  const firstChapterStart = Math.min(...chapters.map((chapter) => chapter.start));
  const generalText = text.slice(0, firstChapterStart);

  const parts: string[] = [];
  if (generalText.trim()) {
    parts.push(
      `=== CONTEXTE DU DOCUMENT (début, dispositions générales / lexique — extraits, possiblement tronqués) ===\n${truncateKeepingHeadAndTail(generalText, generalBudgetChars)}`,
    );
  }
  parts.push(
    `=== SECTION DU RÈGLEMENT POUR LA ZONE ${matching[0].code} (contient la zone demandée ${zoneCode}) ===\n${truncateKeepingHeadAndTail(zoneText, zoneBudgetChars)}`,
  );

  return {
    excerpt: parts.join('\n\n'),
    matchedChapterCode: matching[0].code,
    zoneChapterChars: zoneText.length,
  };
}

/**
 * Normalization applied to both the source text and the quotes before the
 * `includes()` check: whitespace runs, casing and typographic quotes must not
 * cause false rejections.
 */
export function normalizeForQuoteCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/­/g, '')
    .replace(/[\s ]+/g, ' ')
    // pdf-parse keeps end-of-line hyphenation ("iden- tifiés"); models quote
    // the dehyphenated word. Join hyphens between letters on both sides so a
    // hyphenated line break and the plain word normalize identically.
    .replace(/(\p{L})-\s?(?=\p{L})/gu, '$1')
    .trim();
}

/** Recursively collect every non-empty `quote` string of an extraction. */
export function collectQuotes(
  node: unknown,
  path = '$',
): Array<{ path: string; quote: string }> {
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => collectQuotes(item, `${path}[${index}]`));
  }
  if (!node || typeof node !== 'object') return [];

  const quotes: Array<{ path: string; quote: string }> = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'quote' && typeof value === 'string' && value.trim().length > 0) {
      quotes.push({ path, quote: value });
    } else {
      quotes.push(...collectQuotes(value, `${path}.${key}`));
    }
  }
  return quotes;
}

export interface ExtractionValidation {
  ok: boolean;
  zoneOk: boolean;
  totalQuotes: number;
  missingQuotes: Array<{ path: string; quote: string }>;
  problems: string[];
}

export interface ExtractionValidationOptions {
  /** Above this ratio of unverifiable quotes, the extraction is rejected. */
  maxMissingQuoteRatio?: number;
  /** When true, an extraction without any quote is rejected. */
  requireQuotes?: boolean;
}

const normalizeZoneCode = (code: unknown): string =>
  String(code ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

/**
 * A-posteriori check of an LLM extraction against the text it was given:
 * the announced zone must be the requested one, and the verbatim quotes must
 * actually exist in the source text (paraphrases and rules imported from a
 * neighbouring sub-sector — the UMd1/UMd2 bug — fail this check).
 */
export function validateExtractedRules(
  rules: Record<string, unknown> | null,
  referenceText: string,
  zoneCode: string,
  options: ExtractionValidationOptions = {},
): ExtractionValidation {
  const { maxMissingQuoteRatio = 0.5, requireQuotes = true } = options;
  const problems: string[] = [];

  const extractedCode = (rules?.zone as Record<string, unknown> | undefined)?.code;
  const normalizedExtracted = normalizeZoneCode(extractedCode);
  const normalizedRequested = normalizeZoneCode(zoneCode);
  const zoneOk =
    normalizedRequested.length > 0 &&
    (normalizedExtracted === normalizedRequested ||
      normalizedExtracted.includes(normalizedRequested));
  if (!zoneOk) {
    problems.push(
      `zone.code extrait ("${String(extractedCode ?? 'absent')}") ne correspond pas à la zone demandée "${zoneCode}"`,
    );
  }

  const quotes = rules ? collectQuotes(rules) : [];
  const normalizedReference = normalizeForQuoteCheck(referenceText || '');
  const missingQuotes = quotes.filter(
    (entry) => !normalizedReference.includes(normalizeForQuoteCheck(entry.quote)),
  );
  for (const missing of missingQuotes) {
    problems.push(
      `citation introuvable dans le texte source (${missing.path}): "${missing.quote.slice(0, 120)}"`,
    );
  }

  let ok = zoneOk;
  if (requireQuotes && quotes.length === 0) {
    ok = false;
    problems.push('aucune citation verbatim ("quote") fournie dans l\'extraction');
  }
  if (quotes.length > 0 && missingQuotes.length / quotes.length > maxMissingQuoteRatio) {
    ok = false;
  }

  return { ok, zoneOk, totalQuotes: quotes.length, missingQuotes, problems };
}
