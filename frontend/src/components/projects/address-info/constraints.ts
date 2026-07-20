import { Address, NoiseExposureInfo } from '@/types';

export interface AddressConstraints {
  hasFloodZone: boolean;
  isHighRiskFloodZone: boolean;
  hasAbfProtection: boolean;
  hasNoiseExposure: boolean;
  isHighRiskNoiseZone: boolean;
  hasMajorConstraints: boolean;
}

// Zone colors used by PPR regulatory zonings, with their optional shade
const FLOOD_ZONE_COLOR_REGEX =
  /\b(?:rouge|orange|bleue?|violette?|verte?|jaune|grise?|blanche?|noire?)(?:\s+(?:très\s+)?(?:foncée?|claire?|sombre))?/i;

/**
 * Short label for the flood zone badge: the zone color extracted from the
 * full PPR zoning libelle (e.g. "Zonage réglementaire rouge foncé du PPRI
 * du Thouet" -> "rouge foncé"). Falls back to the full text when no color
 * is present (AZI/EAIP wording, zone codes like "R1"...).
 */
export function floodZoneShortLabel(floodZone: string): string {
  const match = floodZone.match(FLOOD_ZONE_COLOR_REGEX);
  return match ? match[0] : floodZone;
}

/**
 * Severity tiers for the "Autres risques identifiés (Géorisques)" badges
 * (sismicité, retrait-gonflement argile, and the other Géorisques rapport
 * risque items). Every item shown there is already a risk confirmed at the
 * address, so the baseline tier is "low" rather than neutral: none of them
 * should read as informational-only. The tier is escalated based on the
 * severity wording Géorisques itself uses (e.g. "3 - MODEREE" for
 * sismicité, "fort"/"moyen"/"faible" for argile, "Risque Existant - Fort"
 * for rapport risque items), same approach already used for
 * isHighRiskFloodZone above.
 */
export type RiskSeverity = 'high' | 'medium' | 'low';

export function classifyRiskSeverity(
  text: string | null | undefined
): RiskSeverity {
  const normalized = (text || '').toLowerCase();
  if (/\bfort|\bélevé|\bmajeur/.test(normalized)) return 'high';
  if (/\bmoyen|\bmodéré/.test(normalized)) return 'medium';
  return 'low';
}

const RISK_SEVERITY_BADGE_CLASSES: Record<RiskSeverity, string> = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-orange-100 text-orange-800 border-orange-300',
  low: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

/** Tailwind classes for a Géorisques risk badge, colored by severity tier. */
export function riskSeverityBadgeClass(text: string | null | undefined): string {
  return RISK_SEVERITY_BADGE_CLASSES[classifyRiskSeverity(text)];
}

// Derive regulatory constraint flags shared by the compact and full variants
export function deriveAddressConstraints(
  address: Address,
  noiseExposure?: NoiseExposureInfo
): AddressConstraints {
  const hasFloodZone = Boolean(address.floodZone && address.floodZone !== 'null');
  const isHighRiskFloodZone = Boolean(
    hasFloodZone &&
      (address.floodZone?.toLowerCase().includes('rouge') ||
        address.floodZoneLevel?.toLowerCase() === 'fort')
  );
  const hasAbfProtection = address.isAbfProtected === true;
  const hasNoiseExposure = noiseExposure?.isInNoiseZone === true;
  const isHighRiskNoiseZone =
    hasNoiseExposure && (noiseExposure?.zone === 'A' || noiseExposure?.zone === 'B');

  return {
    hasFloodZone,
    isHighRiskFloodZone,
    hasAbfProtection,
    hasNoiseExposure,
    isHighRiskNoiseZone,
    hasMajorConstraints:
      isHighRiskFloodZone || hasAbfProtection || isHighRiskNoiseZone,
  };
}
