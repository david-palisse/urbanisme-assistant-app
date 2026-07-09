import { Address, AddressSuggestion, FullLocationInfo, ParcelInfo } from '@/types';

const PENDING_TERRAIN_KEY = 'pending_terrain';

/**
 * Terrain selected from the public search, together with the regulatory info
 * already fetched for it, kept in sessionStorage so it can be attached to a
 * project (and persisted without re-calling the APIs) after login / signup.
 */
export interface PendingTerrain {
  suggestion: AddressSuggestion;
  fullInfo?: FullLocationInfo | null;
  parcel?: ParcelInfo | null;
}

export function savePendingTerrain(terrain: PendingTerrain): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_TERRAIN_KEY, JSON.stringify(terrain));
}

export function getPendingTerrain(): PendingTerrain | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_TERRAIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingTerrain | AddressSuggestion;
    // Legacy shape: a bare AddressSuggestion
    if ('lat' in parsed && typeof parsed.lat === 'number') {
      return { suggestion: parsed as AddressSuggestion };
    }
    const terrain = parsed as PendingTerrain;
    if (
      typeof terrain.suggestion?.lat !== 'number' ||
      typeof terrain.suggestion?.lon !== 'number'
    ) {
      return null;
    }
    return terrain;
  } catch {
    return null;
  }
}

export function clearPendingTerrain(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_TERRAIN_KEY);
}

/**
 * Build the public terrain info page URL for a search result
 */
export function terrainUrl(suggestion: AddressSuggestion): string {
  const params = new URLSearchParams({
    lat: suggestion.lat.toString(),
    lon: suggestion.lon.toString(),
    label: suggestion.label,
    city: suggestion.city || '',
    postcode: suggestion.postcode || '',
    citycode: suggestion.citycode || '',
  });
  return `/terrain?${params.toString()}`;
}

/**
 * Build a display-only Address object (as used by AddressInfo) from the
 * public geocoding + urbanisme endpoints, without any stored project.
 */
export function buildAddressFromLocationInfo(
  suggestion: AddressSuggestion,
  fullInfo: FullLocationInfo | null,
  parcel: ParcelInfo | null
): Address {
  return {
    id: '',
    projectId: '',
    rawInput: suggestion.label,
    lat: suggestion.lat,
    lon: suggestion.lon,
    inseeCode: suggestion.citycode || parcel?.codeInsee,
    parcelId: parcel?.parcelId,
    cityName: suggestion.city,
    postCode: suggestion.postcode,
    pluZone: fullInfo?.pluZone?.zoneCode,
    pluZoneLabel: fullInfo?.pluZone?.zoneLabel,
    floodZone: fullInfo ? fullInfo.floodZone.zoneType : undefined,
    floodZoneLevel: fullInfo?.floodZone.riskLevel ?? null,
    floodZoneSource: fullInfo?.floodZone.sourceName ?? null,
    isAbfProtected: fullInfo?.abfProtection.isProtected ?? false,
    abfType: fullInfo?.abfProtection.protectionType ?? null,
    abfPerimeter: fullInfo?.abfProtection.perimeterDescription ?? null,
    abfMonumentName: fullInfo?.abfProtection.monumentName ?? null,
    seismicZone: fullInfo?.naturalRisks.seismicZone ?? null,
    clayRisk: fullInfo?.naturalRisks.clayRisk ?? null,
    createdAt: '',
    updatedAt: '',
  };
}
