export interface PluZoneInfo {
  zoneCode: string;
  zoneLabel: string;
  typezone: string;
  inseeCode: string;
  communeName?: string;
  partition?: string;
  documentName?: string; // Name of the urban planning document (e.g., "PLUm de Nantes Métropole")
  // Geoportail Urbanisme document id (used with https://www.geoportail-urbanisme.gouv.fr/api/document/{id}/details)
  documentId?: string;
  documentType?: string;
  documentDate?: string;
}

export interface PluDocumentFile {
  name: string;
  url: string;
  category: 'reglement' | 'reglement_graphique' | 'rapport' | 'procedure' | 'annexe' | 'autre';
}

export interface PluDocumentInfo {
  documentId: string;
  name: string; // e.g. "PSMV_244400404"
  title: string; // e.g. "Plan de Sauvegarde et de Mise en Valeur (PSMV) NANTES METROPOLE"
  type: string; // PLU, PLUi, PSMV, CC...
  archiveUrl: string | null; // Full document archive (zip) download URL
  files: PluDocumentFile[];
}

export interface FloodZoneInfo {
  isInFloodZone: boolean;
  zoneType: string | null; // 'rouge', 'bleu', 'orange', etc.
  riskLevel: string | null; // 'fort', 'moyen', 'faible'
  sourceName: string | null; // PPRI document name
  description: string | null;
}

export interface AbfProtectionInfo {
  isProtected: boolean;
  protectionType: string | null; // 'MH' (Monument Historique), 'SPR', 'AVAP', 'ZPPAUP'
  perimeterDescription: string | null;
  monumentName: string | null;
  distance: number | null; // Distance to monument in meters
}

export interface NaturalRisksInfo {
  seismicZone: string | null; // Zone 1-5
  clayRisk: string | null; // fort, moyen, faible
}

export interface NoiseExposureInfo {
  isInNoiseZone: boolean;
  zone: string | null; // Zone A, B, C, D (PEB zones - converted from numeric)
  airportName: string | null;
  airportCode: string | null;
  indiceLden: number | null; // Noise level day-evening-night
  indiceLn: number | null; // Noise level night
  approvalDate: string | null;
  documentRef: string | null;
  restrictions: string | null; // Description of construction restrictions
}

export interface FullLocationInfo {
  pluZone: PluZoneInfo | null;
  pluZones: PluZoneInfo[]; // All PLU zones at this location
  floodZone: FloodZoneInfo;
  abfProtection: AbfProtectionInfo;
  naturalRisks: NaturalRisksInfo;
  noiseExposure: NoiseExposureInfo;
}

export interface PluRulesetResponse {
  rules: Record<string, unknown>;
  sourceUrl: string | null;
  documentName: string | null;
  documentId: string | null;
  documentType: string | null;
  documentDate: string | null;
}
