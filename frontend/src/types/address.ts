// Address types
export interface Address {
  id: string;
  projectId: string;
  rawInput: string;
  lat: number;
  lon: number;
  inseeCode?: string;
  parcelId?: string;
  pluZone?: string;
  pluZoneLabel?: string;
  cityName?: string;
  postCode?: string;
  // Flood zone information
  floodZone?: string | null;
  floodZoneLevel?: string | null;
  floodZoneSource?: string | null;
  // ABF (Monument Historique) protection
  isAbfProtected?: boolean;
  abfType?: string | null;
  abfPerimeter?: string | null;
  abfMonumentName?: string | null;
  // Other risks
  seismicZone?: string | null;
  clayRisk?: string | null;
  createdAt: string;
  updatedAt: string;
}

// PLU Zone info type
export interface PluZoneInfo {
  zoneCode: string;
  zoneLabel: string;
  typezone: string;
  inseeCode: string;
  partition?: string;
  documentName?: string; // Name of the urban planning document (e.g., "PLUm de Nantes Métropole")
}

// Noise Exposure (PEB - Plan d'Exposition au Bruit) info
export interface NoiseExposureInfo {
  isInNoiseZone: boolean;
  zone: string | null; // Zone A, B, C, D (PEB zones)
  airportName: string | null;
  airportCode: string | null;
  indiceLden: number | null; // Noise level day-evening-night
  indiceLn: number | null; // Noise level night
  approvalDate: string | null;
  documentRef: string | null;
  restrictions: string | null; // Description of construction restrictions
}

// Full location regulatory info response
export interface FullLocationInfo {
  pluZone: PluZoneInfo | null;
  pluZones: PluZoneInfo[]; // All PLU zones at this location (including prescriptions)
  floodZone: {
    isInFloodZone: boolean;
    zoneType: string | null;
    riskLevel: string | null;
    sourceName: string | null;
    description: string | null;
  };
  abfProtection: {
    isProtected: boolean;
    protectionType: string | null;
    perimeterDescription: string | null;
    monumentName: string | null;
    distance: number | null;
  };
  naturalRisks: {
    seismicZone: string | null;
    clayRisk: string | null;
  };
  noiseExposure: NoiseExposureInfo;
}
