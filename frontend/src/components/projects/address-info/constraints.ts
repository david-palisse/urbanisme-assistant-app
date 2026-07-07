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
