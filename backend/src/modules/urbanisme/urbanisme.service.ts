import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
const pdfParse = require('pdf-parse');

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

@Injectable()
export class UrbanismeService {
  private readonly logger = new Logger(UrbanismeService.name);
  private readonly GPU_API_URL = 'https://apicarto.ign.fr/api/gpu/zone-urba';
  private readonly GPU_DOCUMENT_URL = 'https://apicarto.ign.fr/api/gpu/document';
  private readonly GPU_SUP_URL = 'https://apicarto.ign.fr/api/gpu/secteur-cc';
  private readonly GEORISQUES_API_URL = 'https://www.georisques.gouv.fr/api/v1';
  private readonly GEOPLATEFORME_WFS_URL = 'https://data.geopf.fr/wfs';
  private readonly GEO_API_URL = 'https://geo.api.gouv.fr';

  // Cache for document names and EPCI names to avoid repeated API calls
  private documentNameCache: Map<string, string> = new Map();
  private epciNameCache: Map<string, string> = new Map();
  private openai: OpenAI | null = null;
  private openaiModel: string = 'gpt-4o';

  // Document type labels - single source of truth
  private readonly DOC_TYPE_LABELS: Record<string, string> = {
    'PLU': 'PLU',
    'PLUI': 'PLUi',
    'PSMV': 'PSMV',
    'POS': 'POS',
    'CC': 'Carte Communale',
    'RNU': 'RNU',
  };

  /**
   * Convert WGS84 (EPSG:4326) coordinates to Web Mercator (EPSG:3857)
   * Formula: x = lon * 20037508.34 / 180
   *          y = ln(tan((90 + lat) * PI / 360)) / PI * 20037508.34
   */
  private wgs84ToWebMercator(lat: number, lon: number): { x: number; y: number } {
    const x = (lon * 20037508.34) / 180;
    const latRad = (lat * Math.PI) / 180;
    const y = (Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) * 20037508.34;
    return { x, y };
  }

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('openai.apiKey') ||
      process.env.OPENAI_API_KEY;
    this.openaiModel =
      this.configService.get<string>('openai.model') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o';

    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  /**
   * Get document name from partition.
   * Uses geo.api.gouv.fr to get properly formatted territory names.
   * Returns names like "PLUi CC du Thouarsais" or "PSMV Nantes Métropole"
   */
  async getDocumentName(partition: string): Promise<string | null> {
    if (!partition) return null;

    // Check cache first
    if (this.documentNameCache.has(partition)) {
      return this.documentNameCache.get(partition) || null;
    }

    try {
      // Extract code and type from partition
      // Formats: "DU_247900798", "PSMV_244400404", "DU_247900798_A", etc.
      const partitionMatch = partition.match(/^([A-Z]+)_(\d{5,9})(?:_[A-Z])?$/);
      if (!partitionMatch) {
        this.logger.warn(`Could not parse partition: ${partition}`);
        return null;
      }

      const partitionType = partitionMatch[1];
      const code = partitionMatch[2];
      const isIntercommunal = code.length === 9;

      // Get territory name from geo.api.gouv.fr (returns clean formatted names)
      let territoryName = '';
      if (isIntercommunal) {
        territoryName = await this.getEpciName(code) || '';
      } else {
        territoryName = await this.getCommuneName(code) || '';
      }

      if (!territoryName) {
        this.logger.warn(`Could not get territory name for code: ${code}`);
        return null;
      }

      // Build document name: just use the territory name as-is from the API
      // The API already returns proper names like "CC du Thouarsais" or "Nantes Métropole"
      let documentName = '';

      // Determine document type label
      const typeLabel = this.DOC_TYPE_LABELS[partitionType] ||
                       (partitionType === 'DU' ? (isIntercommunal ? 'PLUi' : 'PLU') : partitionType);

      // If territory name already includes a structure type (CC, CA, CU, Métropole, etc.),
      // just prepend the document type
      documentName = `${typeLabel} ${territoryName}`;

      // Cache and return
      this.documentNameCache.set(partition, documentName);
      this.logger.log(`Document name for ${partition}: ${documentName}`);
      return documentName;
    } catch (error) {
      this.logger.warn(`Error getting document name for ${partition}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get EPCI (intercommunality) name from SIREN code using geo.api.gouv.fr
   */
  async getEpciName(sirenCode: string): Promise<string | null> {
    if (!sirenCode || sirenCode.length !== 9) return null;

    // Check cache first
    if (this.epciNameCache.has(sirenCode)) {
      return this.epciNameCache.get(sirenCode) || null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.GEO_API_URL}/epcis/${sirenCode}`, {
          timeout: 10000,
        }),
      );

      const epci = response.data;
      if (epci && epci.nom) {
        const name = epci.nom;
        this.epciNameCache.set(sirenCode, name);
        this.logger.log(`Found EPCI name for ${sirenCode}: ${name}`);
        return name;
      }

      return null;
    } catch (error) {
      this.logger.warn(`geo.api.gouv.fr EPCI lookup error for ${sirenCode}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get commune name from INSEE code using geo.api.gouv.fr
   */
  async getCommuneName(inseeCode: string): Promise<string | null> {
    if (!inseeCode || inseeCode.length !== 5) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.GEO_API_URL}/communes/${inseeCode}`, {
          params: { fields: 'nom,codesPostaux,codeEpci' },
          timeout: 10000,
        }),
      );

      const commune = response.data;
      if (commune && commune.nom) {
        return commune.nom;
      }

      return null;
    } catch (error) {
      this.logger.warn(`geo.api.gouv.fr commune lookup error for ${inseeCode}: ${error.message}`);
      return null;
    }
  }

  async getPluZone(parcelId: string, lat?: number, lon?: number): Promise<PluZoneInfo | null> {
    // First check cache
    const cachedZone = await this.getCachedZone(parcelId);
    if (cachedZone) {
      return cachedZone;
    }

    if (!lat || !lon) {
      throw new BadRequestException('Coordinates are required if parcel not in cache');
    }

    try {
      // Create a small polygon around the point for the API query
      const buffer = 0.0001; // About 10 meters
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lon, lat],
      });

      const response = await firstValueFrom(
        this.httpService.get(this.GPU_API_URL, {
          params: {
            geom,
          },
        }),
      );

      const features = response.data.features || [];

      if (features.length === 0) {
        this.logger.warn(`No PLU zone found for parcel ${parcelId}`);
        return null;
      }

      // Find the most relevant zone (main urban zone)
      const zone = features[0].properties;

      const zoneInfo: PluZoneInfo = {
        zoneCode: zone.libelle || zone.typezone,
        zoneLabel: zone.libelong || zone.libelle || 'Zone non définie',
        typezone: zone.typezone,
        inseeCode: zone.insee || '',
        partition: zone.partition,
      };

      // Cache the result
      await this.cacheZone(parcelId, zoneInfo);

      return zoneInfo;
    } catch (error) {
      this.logger.error(`GPU API error: ${error.message}`);
      // Return null instead of throwing - PLU info may not be available
      return null;
    }
  }

  async getPluZoneByCoordinates(lat: number, lon: number): Promise<PluZoneInfo | null> {
    try {
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lon, lat],
      });

      const response = await firstValueFrom(
        this.httpService.get(this.GPU_API_URL, {
          params: {
            geom,
          },
        }),
      );

      const features = response.data.features || [];

      if (features.length === 0) {
        return null;
      }

      const zone = features[0].properties;

      return {
        zoneCode: zone.libelle || zone.typezone,
        zoneLabel: zone.libelong || zone.libelle || 'Zone non définie',
        typezone: zone.typezone,
        inseeCode: zone.insee || '',
        partition: zone.partition,
      };
    } catch (error) {
      this.logger.error(`GPU API error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get ALL PLU zones at a given coordinate (returns array instead of single zone)
   * This includes overlapping zones from zone-urba and prescriptions
   */
  async getAllPluZonesByCoordinates(lat: number, lon: number): Promise<PluZoneInfo[]> {
    const zones: PluZoneInfo[] = [];
    const partitionsToResolve: Set<string> = new Set();

    try {
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lon, lat],
      });

      // 1. Get main PLU zones (zone-urba)
      try {
        const zoneUrbaResponse = await firstValueFrom(
          this.httpService.get(this.GPU_API_URL, {
            params: { geom },
            timeout: 10000,
          }),
        );

        const zoneUrbaFeatures = zoneUrbaResponse.data.features || [];
        for (const feature of zoneUrbaFeatures) {
          const zone = feature.properties;
          const partition = zone.partition || '';
          if (partition) partitionsToResolve.add(partition);

          zones.push({
            zoneCode: zone.libelle || zone.typezone,
            zoneLabel: zone.libelong || zone.libelle || 'Zone non définie',
            typezone: zone.typezone,
            inseeCode: zone.insee || '',
            partition: partition,
            documentId: zone.gpu_doc_id || null,
          });
        }
      } catch (error) {
        this.logger.warn(`GPU zone-urba API error: ${error.message}`);
      }

      // 2. Get prescriptions surfaciques (additional zones/restrictions)
      try {
        const prescSurfResponse = await firstValueFrom(
          this.httpService.get('https://apicarto.ign.fr/api/gpu/prescription-surf', {
            params: { geom },
            timeout: 10000,
          }),
        );

        const prescSurfFeatures = prescSurfResponse.data.features || [];
        for (const feature of prescSurfFeatures) {
          const props = feature.properties;
          const partition = props.partition || '';
          if (partition) partitionsToResolve.add(partition);

          zones.push({
            zoneCode: props.libelle || props.typepsc || 'Prescription',
            zoneLabel: props.txt || props.libellong || props.libelle || 'Prescription surfacique',
            typezone: `PSC-${props.typepsc || 'SURF'}`,
            inseeCode: props.insee || '',
            partition: partition,
            documentId: props.gpu_doc_id || null,
          });
        }
      } catch (error) {
        this.logger.warn(`GPU prescription-surf API error: ${error.message}`);
      }

      // 3. Get prescriptions linéaires (linear prescriptions that may apply)
      try {
        const prescLinResponse = await firstValueFrom(
          this.httpService.get('https://apicarto.ign.fr/api/gpu/prescription-lin', {
            params: { geom },
            timeout: 10000,
          }),
        );

        const prescLinFeatures = prescLinResponse.data.features || [];
        for (const feature of prescLinFeatures) {
          const props = feature.properties;
          const partition = props.partition || '';
          if (partition) partitionsToResolve.add(partition);

          zones.push({
            zoneCode: props.libelle || props.typepsc || 'Prescription linéaire',
            zoneLabel: props.txt || props.libellong || props.libelle || 'Prescription linéaire',
            typezone: `PSC-${props.typepsc || 'LIN'}`,
            inseeCode: props.insee || '',
            partition: partition,
            documentId: props.gpu_doc_id || null,
          });
        }
      } catch (error) {
        this.logger.warn(`GPU prescription-lin API error: ${error.message}`);
      }

      // 4. Get secteurs de carte communale if applicable
      try {
        const secteurCcResponse = await firstValueFrom(
          this.httpService.get('https://apicarto.ign.fr/api/gpu/secteur-cc', {
            params: { geom },
            timeout: 10000,
          }),
        );

        const secteurCcFeatures = secteurCcResponse.data.features || [];
        for (const feature of secteurCcFeatures) {
          const props = feature.properties;
          const partition = props.partition || '';
          if (partition) partitionsToResolve.add(partition);

          zones.push({
            zoneCode: props.libelle || 'Secteur CC',
            zoneLabel: props.libellong || props.libelle || 'Secteur de carte communale',
            typezone: 'SECTEUR-CC',
            inseeCode: props.insee || '',
            partition: partition,
            documentId: props.gpu_doc_id || null,
          });
        }
      } catch (error) {
        // Secteur CC may not exist for all communes - not an error
        this.logger.debug(`GPU secteur-cc API: ${error.message}`);
      }

      // 5. Fetch document names for all unique partitions (in parallel)
      if (partitionsToResolve.size > 0) {
        const documentNamePromises = Array.from(partitionsToResolve).map(async (partition) => {
          const docName = await this.getDocumentName(partition);
          return { partition, docName };
        });

        try {
          const docResults = await Promise.all(documentNamePromises);
          const partitionToDocName = new Map<string, string>();
          for (const { partition, docName } of docResults) {
            if (docName) {
              partitionToDocName.set(partition, docName);
            }
          }

          // Update zones with document names
          for (const zone of zones) {
            if (zone.partition && partitionToDocName.has(zone.partition)) {
              zone.documentName = partitionToDocName.get(zone.partition);
            }
          }
        } catch (error) {
          this.logger.warn(`Error fetching document names: ${error.message}`);
        }
      }

      this.logger.log(`Found ${zones.length} PLU zones/prescriptions at coordinates (${lat}, ${lon})`);
      return zones;
    } catch (error) {
      this.logger.error(`getAllPluZonesByCoordinates error: ${error.message}`);
      return zones; // Return whatever we managed to collect
    }
  }

  async updateProjectPluZone(projectId: string): Promise<PluZoneInfo | null> {
    // Get project address
    const address = await this.prisma.address.findUnique({
      where: { projectId },
    });

    if (!address) {
      throw new BadRequestException('Project has no address');
    }

    // Get PLU zone
    const zoneInfo = await this.getPluZoneByCoordinates(address.lat, address.lon);

    if (zoneInfo) {
      // Update address with PLU zone
      await this.prisma.address.update({
        where: { projectId },
        data: {
          pluZone: zoneInfo.zoneCode,
          pluZoneLabel: zoneInfo.zoneLabel,
        },
      });
    }

    return zoneInfo;
  }

  /**
   * Get flood zone information from Géorisques API
   */
  async getFloodZoneInfo(lat: number, lon: number): Promise<FloodZoneInfo> {
    try {
      // Use the Géorisques GASPAR API to get flood risks by coordinates
      const communeResponse = await firstValueFrom(
        this.httpService.get(`${this.GEORISQUES_API_URL}/gaspar/risques`, {
          params: {
            latlon: `${lon},${lat}`,
            rayon: 100, // 100m radius
          },
          timeout: 10000,
        }),
      );

      const data = communeResponse.data?.data || [];

      // Look for flood risk in risques_detail array
      // num_risque "11" = Inondation (main flood risk code)
      let hasFloodRisk = false;
      let communeName = '';

      for (const commune of data) {
        communeName = commune.libelle_commune || '';
        if (commune.risques_detail) {
          const floodRisk = commune.risques_detail.find((r: any) =>
            r.num_risque === '11' ||
            r.libelle_risque_long?.toLowerCase().includes('inondation')
          );
          if (floodRisk) {
            hasFloodRisk = true;
            break;
          }
        }
        // Also check older format with "risques" array
        if (commune.risques) {
          const floodRisk = commune.risques.find((r: any) =>
            r.code_risque === '11' ||
            r.libelle_risque?.toLowerCase().includes('inondation')
          );
          if (floodRisk) {
            hasFloodRisk = true;
            break;
          }
        }
      }

      // If we found flood risk info in GASPAR, try to get PPR details
      if (hasFloodRisk) {
        try {
          const pprResponse = await firstValueFrom(
            this.httpService.get(`${this.GEORISQUES_API_URL}/ppr`, {
              params: {
                latlon: `${lon},${lat}`,
                rayon: 500, // 500m radius to find nearby PPR
              },
              timeout: 10000,
            }),
          );

          const pprData = pprResponse.data?.data || [];
          const floodPpr = pprData.find((p: any) =>
            p.risque?.code_risque === '11' ||
            p.risque?.libelle_risque?.toLowerCase().includes('inondation') ||
            p.nom_ppr?.toLowerCase().includes('inondation')
          );

          if (floodPpr) {
            const pprName = floodPpr.nom_ppr || 'PPRI';
            const riskClass = floodPpr.risque?.classes_alea?.[0]?.libelle || '';

            return {
              isInFloodZone: true,
              zoneType: 'rouge',
              riskLevel: 'fort',
              sourceName: pprName,
              description: `Zone couverte par un PPRI approuvé. ${riskClass}. Constructions potentiellement interdites ou très réglementées.`,
            };
          }
        } catch (pprError) {
          this.logger.warn(`PPR API call failed: ${pprError.message}`);
        }

        // If only commune-level risk is known, do not label the parcel as flood zone
        return {
          isInFloodZone: false,
          zoneType: null,
          riskLevel: null,
          sourceName: 'GASPAR',
          description: `Commune ${communeName} soumise au risque inondation. Vérifier le PPRI local pour confirmer la zone parcellaire.`,
        };
      }

      return {
        isInFloodZone: false,
        zoneType: null,
        riskLevel: null,
        sourceName: null,
        description: null,
      };
    } catch (error) {
      this.logger.error(`Géorisques API error: ${error.message}`);
      // Return unknown state rather than crash
      return {
        isInFloodZone: false,
        zoneType: null,
        riskLevel: null,
        sourceName: null,
        description: 'Impossible de vérifier - consultez le PPRI local',
      };
    }
  }

  /**
   * Check if location is within ABF (Architectes des Bâtiments de France) protection zone
   * This includes: Monuments Historiques (500m perimeter), SPR, AVAP, ZPPAUP
   */
  async getAbfProtectionInfo(lat: number, lon: number): Promise<AbfProtectionInfo> {
    try {
      // Use GPU API to check for heritage protection zones (SUP)
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lon, lat],
      });

      // Check for Servitudes d'Utilité Publique related to monuments
      // AC1 = Protection des monuments historiques
      // AC2 = Sites patrimoniaux
      const supResponse = await firstValueFrom(
        this.httpService.get('https://apicarto.ign.fr/api/gpu/prescription-surf', {
          params: { geom },
          timeout: 10000,
        }),
      );

      const features = supResponse.data?.features || [];

      // Look for heritage-related prescriptions
      for (const feature of features) {
        const props = feature.properties || {};
        const libelle = (props.libelle || '').toLowerCase();
        const libellong = (props.libellong || '').toLowerCase();
        const typepsc = props.typepsc || '';

        // Check for Monument Historique related prescriptions
        if (libelle.includes('monument') ||
            libelle.includes('abf') ||
            libelle.includes('périmètre de protection') ||
            libellong.includes('monument historique') ||
            typepsc === '07' || // Type 07 = Patrimoine
            typepsc === 'AC1') {
          return {
            isProtected: true,
            protectionType: 'MH',
            perimeterDescription: 'Périmètre de protection de 500m autour d\'un monument historique',
            monumentName: props.txt || props.libelle || 'Monument historique à proximité',
            distance: null,
          };
        }

        // Check for SPR (Site Patrimonial Remarquable)
        if (libelle.includes('spr') ||
            libelle.includes('site patrimonial') ||
            libellong.includes('site patrimonial remarquable')) {
          return {
            isProtected: true,
            protectionType: 'SPR',
            perimeterDescription: 'Site Patrimonial Remarquable',
            monumentName: props.txt || null,
            distance: null,
          };
        }

        // Check for AVAP/ZPPAUP
        if (libelle.includes('avap') ||
            libelle.includes('zppaup')) {
          return {
            isProtected: true,
            protectionType: libelle.includes('avap') ? 'AVAP' : 'ZPPAUP',
            perimeterDescription: 'Aire de mise en Valeur de l\'Architecture et du Patrimoine',
            monumentName: null,
            distance: null,
          };
        }
      }

      // Also try to check directly with Atlas des Patrimoines data via alternative method
      // Check GPU for "secteur_cc" (secteurs de carte communale) which sometimes includes heritage zones
      try {
        const secResponse = await firstValueFrom(
          this.httpService.get('https://apicarto.ign.fr/api/gpu/secteur-cc', {
            params: { geom },
            timeout: 10000,
          }),
        );

        const secFeatures = secResponse.data?.features || [];
        for (const feature of secFeatures) {
          const props = feature.properties || {};
          const libelle = (props.libelle || '').toLowerCase();

          if (libelle.includes('monument') || libelle.includes('abf') || libelle.includes('patrimoine')) {
            return {
              isProtected: true,
              protectionType: 'MH',
              perimeterDescription: props.libelle || 'Zone protégée',
              monumentName: null,
              distance: null,
            };
          }
        }
      } catch {
        // Ignore secteur-cc errors
      }

      return {
        isProtected: false,
        protectionType: null,
        perimeterDescription: null,
        monumentName: null,
        distance: null,
      };
    } catch (error) {
      this.logger.error(`ABF protection check error: ${error.message}`);
      // Return unknown state
      return {
        isProtected: false,
        protectionType: null,
        perimeterDescription: 'Impossible de vérifier - consultez le service urbanisme local',
        monumentName: null,
        distance: null,
      };
    }
  }

  /**
   * Get other natural risks (seismic, clay)
   */
  async getNaturalRisksInfo(lat: number, lon: number): Promise<NaturalRisksInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.GEORISQUES_API_URL}/gaspar/risques`, {
          params: {
            latlon: `${lon},${lat}`,
            rayon: 100,
          },
          timeout: 10000,
        }),
      );

      const data = response.data?.data || [];
      let seismicZone = null;
      let clayRisk = null;

      for (const risk of data) {
        // Seismic zone
        if (risk.zonage_sismique) {
          seismicZone = risk.zonage_sismique;
        }

        // Clay risk
        if (risk.alea_argile) {
          const alea = risk.alea_argile.toLowerCase();
          if (alea.includes('fort')) clayRisk = 'fort';
          else if (alea.includes('moyen')) clayRisk = 'moyen';
          else clayRisk = 'faible';
        }
      }

      return { seismicZone, clayRisk };
    } catch (error) {
      this.logger.warn(`Natural risks API error: ${error.message}`);
      return { seismicZone: null, clayRisk: null };
    }
  }

  /**
   * Get noise exposure plan (PEB - Plan d'Exposition au Bruit) information
   * This uses the GeoPortail WFS service for DGAC PGS data (airport noise zones)
   */
  async getNoiseExposureInfo(lat: number, lon: number): Promise<NoiseExposureInfo> {
    try {
      // Convert WGS84 to Web Mercator (EPSG:3857) for the query
      const { x, y } = this.wgs84ToWebMercator(lat, lon);

      // Query the GeoPortail WFS for PEB data using CQL_FILTER with INTERSECTS
      const response = await firstValueFrom(
        this.httpService.get(this.GEOPLATEFORME_WFS_URL, {
          params: {
            SERVICE: 'WFS',
            VERSION: '2.0.0',
            REQUEST: 'GetFeature',
            TYPENAME: 'DGAC-PGS_BDD_FXX_WM:fxx_pgs_wm',
            OUTPUTFORMAT: 'application/json',
            CQL_FILTER: `INTERSECTS(geom,POINT(${x} ${y}))`,
          },
          timeout: 15000,
        }),
      );

      const features = response.data?.features || [];

      if (features.length === 0) {
        return {
          isInNoiseZone: false,
          zone: null,
          airportName: null,
          airportCode: null,
          indiceLden: null,
          indiceLn: null,
          approvalDate: null,
          documentRef: null,
          restrictions: null,
        };
      }

      // Get the first (and usually most restrictive) zone
      const feature = features[0];
      const props = feature.properties || {};

      // Convert numeric zone (1, 2, 3, 4) to letter zone (A, B, C, D)
      const numericToLetterZone: Record<string, string> = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
      };

      // Zone descriptions based on letter zone
      const zoneDescriptions: Record<string, string> = {
        'A': 'Zone A - Très fortement exposée au bruit. Construction interdite.',
        'B': 'Zone B - Fortement exposée au bruit. Construction très réglementée.',
        'C': 'Zone C - Modérément exposée au bruit. Construction sous conditions.',
        'D': 'Zone D - Faiblement exposée au bruit. Attestation acoustique requise.',
      };

      const numericZone = props.zone || null;
      const zone = numericZone ? (numericToLetterZone[numericZone] || numericZone) : null;
      const restrictions = zone ? zoneDescriptions[zone] || `Zone ${zone} du PEB` : null;

      this.logger.log(`Found PEB zone ${zone} (numeric: ${numericZone}) for airport ${props.nom} at coordinates (${lat}, ${lon})`);

      return {
        isInNoiseZone: true,
        zone: zone,
        airportName: props.nom || null,
        airportCode: props.code_oaci || null,
        indiceLden: props.indice_lde || null,
        indiceLn: props.indice_l_1 || null,
        approvalDate: props.date_arret || null,
        documentRef: props.ref_doc || null,
        restrictions: restrictions,
      };
    } catch (error) {
      this.logger.error(`Noise exposure (PEB) API error: ${error.message}`);
      return {
        isInNoiseZone: false,
        zone: null,
        airportName: null,
        airportCode: null,
        indiceLden: null,
        indiceLn: null,
        approvalDate: null,
        documentRef: null,
        restrictions: 'Impossible de vérifier - consultez le PEB local',
      };
    }
  }

  /**
   * Get all location information (PLU zone, flood zone, ABF, natural risks, noise exposure)
   */
  async getFullLocationInfo(lat: number, lon: number): Promise<FullLocationInfo> {
    const [pluZones, floodZone, abfProtection, naturalRisks, noiseExposure] = await Promise.all([
      this.getAllPluZonesByCoordinates(lat, lon),
      this.getFloodZoneInfo(lat, lon),
      this.getAbfProtectionInfo(lat, lon),
      this.getNaturalRisksInfo(lat, lon),
      this.getNoiseExposureInfo(lat, lon),
    ]);

    // Keep backward compatibility: pluZone is the first/main zone
    const pluZone = pluZones.length > 0 ? pluZones[0] : null;

    return {
      pluZone,
      pluZones,
      floodZone,
      abfProtection,
      naturalRisks,
      noiseExposure,
    };
  }

  /**
   * Update project with all location regulatory information
   */
  async updateProjectFullLocationInfo(projectId: string): Promise<FullLocationInfo> {
    const address = await this.prisma.address.findUnique({
      where: { projectId },
    });

    if (!address) {
      throw new BadRequestException('Project has no address');
    }

    // Get all location info
    const fullInfo = await this.getFullLocationInfo(address.lat, address.lon);

    // Update address with all information including noise exposure (PEB)
    await this.prisma.address.update({
      where: { projectId },
      data: {
        pluZone: fullInfo.pluZone?.zoneCode || null,
        pluZoneLabel: fullInfo.pluZone?.zoneLabel || null,
        floodZone: fullInfo.floodZone.zoneType,
        floodZoneLevel: fullInfo.floodZone.riskLevel,
        floodZoneSource: fullInfo.floodZone.sourceName,
        isAbfProtected: fullInfo.abfProtection.isProtected,
        abfType: fullInfo.abfProtection.protectionType,
        abfPerimeter: fullInfo.abfProtection.perimeterDescription,
        abfMonumentName: fullInfo.abfProtection.monumentName,
        seismicZone: fullInfo.naturalRisks.seismicZone,
        clayRisk: fullInfo.naturalRisks.clayRisk,
        // Noise exposure (PEB) data
        isInNoiseZone: fullInfo.noiseExposure.isInNoiseZone,
        noiseZone: fullInfo.noiseExposure.zone,
        noiseAirportName: fullInfo.noiseExposure.airportName,
        noiseAirportCode: fullInfo.noiseExposure.airportCode,
        noiseRestrictions: fullInfo.noiseExposure.restrictions,
      },
    });

    // Best-effort prefetch of written PLU regulation (Geoportail Urbanisme) and rule extraction.
    // This warms up the cache right after an address is set, so the later LLM analysis
    // can rely on real extracted rules.
    if (address.inseeCode && fullInfo.pluZone?.zoneCode) {
      void this.getPluRuleset(
        address.inseeCode,
        fullInfo.pluZone.zoneCode,
        fullInfo.pluZone.documentName || null,
        address.lat,
        address.lon,
      ).catch((error) => {
        this.logger.warn(
          `PLU rules prefetch failed for project ${projectId}: ${error.message}`,
        );
      });
    }

    return fullInfo;
  }

  async getPluRuleset(
    inseeCode: string | null,
    zoneCode: string | null,
    documentName: string | null,
    lat?: number,
    lon?: number,
  ): Promise<Record<string, unknown> | null> {
    if (!inseeCode || !zoneCode) return null;

    const cached = await this.prisma.pluZoneCache.findFirst({
      where: {
        zoneCode,
        inseeCode,
        expiresAt: { gt: new Date() },
      },
    });

    if (cached && cached.rules) {
      const ok = this.hasExtractedRules(cached.rules as Record<string, unknown>);
      if (ok) {
        this.logger.debug(`PLU rules cache HIT for ${inseeCode}/${zoneCode}`);
        return cached.rules as Record<string, unknown>;
      }
      this.logger.warn(`PLU rules cache present but unusable for ${inseeCode}/${zoneCode} (no meaningful extracted values) - refetching`);
    }

    if (!lat || !lon) return null;

    const zones = await this.getAllPluZonesByCoordinates(lat, lon);
    const zone = zones.find((z) => z.zoneCode === zoneCode) || zones[0];

    if (!zone) return null;

    // Use Geoportail Urbanisme details API to get a stable, downloadable PDF for the written regulation.
    const gpuDocumentId = zone.documentId || (await this.getPrimaryDocumentIdByCoordinates(lat, lon));
    this.logger.debug(`PLU document id for ${inseeCode}/${zoneCode}: ${gpuDocumentId || 'null'}`);
    const details = gpuDocumentId
      ? await this.getGeoportailDocumentDetails(gpuDocumentId)
      : null;

    const reglementUrl = details
      ? this.selectReglementWrittenMaterialUrl(details)
      : null;

    this.logger.debug(`PLU reglement URL selected for ${inseeCode}/${zoneCode}: ${reglementUrl || 'null'}`);

    const rules = await this.extractPluRulesFromDocument(
      reglementUrl,
      zone.zoneCode,
      zone.zoneLabel,
      documentName || zone.documentName || null,
    );

    if (rules) {
      const extractedNeighborSetback = (rules as any)?.pool?.minNeighborSetbackMeters;
      const extractedRecul = (rules as any)?.reglesGenerales?.reculLimitesSeparatives?.valeurMetres;
      const extractedCbs = (rules as any)?.pool?.cbsRequired ?? (rules as any)?.reglesGenerales?.cbsRequired;
      this.logger.log(
        `PLU extracted rules summary for ${inseeCode}/${zoneCode}: ` +
          `neighborSetback=${extractedNeighborSetback ?? 'null'}, ` +
          `reculLimitesSeparatives=${extractedRecul ?? 'null'}, ` +
          `cbsRequired=${extractedCbs ?? 'null'}`,
      );
    } else {
      this.logger.warn(`PLU rules extraction returned null for ${inseeCode}/${zoneCode}`);
    }

    await this.upsertPluRulesCache({
      zoneCode: zone.zoneCode,
      // Prefer the INSEE code from BAN (address) because GPU sometimes returns null/empty
      inseeCode: inseeCode,
      rules: rules || {},
      sourceUrl: reglementUrl,
      documentName: documentName || zone.documentName || null,
      documentId: gpuDocumentId || null,
      documentType: (details && (details.type || details.documentType)) || null,
      documentDate: (details && (details.approbationDate || details.publicationDate || details.statusDate)) || null,
    });

    return rules;
  }

  private async getGeoportailDocumentDetails(documentId: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://www.geoportail-urbanisme.gouv.fr/api/document/${documentId}/details`,
          { timeout: 15000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`Geoportail details error for ${documentId}: ${error.message}`);
      return null;
    }
  }

  private selectReglementWrittenMaterialUrl(details: any): string | null {
    const writingMaterials = details?.writingMaterials;
    if (!writingMaterials || typeof writingMaterials !== 'object') return null;

    const entries = Object.entries(writingMaterials) as Array<[string, string]>;

    const reglementCandidates = entries
      .filter(([filename, url]) =>
        typeof filename === 'string' &&
        typeof url === 'string' &&
        filename.toLowerCase().includes('reglement') &&
        filename.toLowerCase().endsWith('.pdf') &&
        !filename.toLowerCase().includes('graphique')
      )
      .map(([, url]) => url);

    if (reglementCandidates.length > 0) return reglementCandidates[0];

    // Fallback: any PDF in written materials
    const anyPdf = entries.find(([filename, url]) =>
      typeof filename === 'string' &&
      typeof url === 'string' &&
      filename.toLowerCase().endsWith('.pdf')
    );

    return anyPdf?.[1] || null;
  }

  private hasExtractedRules(rules: Record<string, unknown>): boolean {
    if (!rules || typeof rules !== 'object') return false;

    const isValidNumber = (v: unknown) => typeof v === 'number' && !Number.isNaN(v);

    // IMPORTANT: do NOT treat mere object presence as “extracted rules”.
    // We only accept the cache if at least one meaningful value has been extracted.
    const neighborSetback = (rules as any)?.pool?.minNeighborSetbackMeters;
    const reculLimitesSeparatives = (rules as any)?.reglesGenerales?.reculLimitesSeparatives?.valeurMetres;
    const reculVoiePublique = (rules as any)?.reglesGenerales?.reculVoiePublique?.valeurMetres;
    const hauteurMax = (rules as any)?.reglesGenerales?.hauteurMaximale?.valeurMetres;
    const empriseRatio = (rules as any)?.reglesGenerales?.empriseMaximale?.ratioMax;
    const cbsGeneral = (rules as any)?.reglesGenerales?.cbsRequired;
    const cbsPool = (rules as any)?.pool?.cbsRequired;

    const hasSetback = isValidNumber(neighborSetback) || isValidNumber(reculLimitesSeparatives);
    const hasOtherNumbers =
      isValidNumber(reculVoiePublique) ||
      isValidNumber(hauteurMax) ||
      isValidNumber(empriseRatio);
    const hasCbs = typeof cbsGeneral === 'boolean' || typeof cbsPool === 'boolean';

    return hasSetback || hasOtherNumbers || hasCbs;
  }

  private async extractPluRulesFromDocument(
    sourceUrl: string | null,
    zoneCode: string,
    zoneLabel: string,
    documentName: string | null,
  ): Promise<Record<string, unknown> | null> {
    if (!sourceUrl || !this.openai) return null;

    try {
      const pdfBuffer = await this.fetchPdfBuffer(sourceUrl);
      if (!pdfBuffer) return null;

      const parsed = await pdfParse(pdfBuffer);
      const text = parsed.text || '';

      if (!text) return null;

      const prompt = this.buildPluExtractionPrompt(text, zoneCode, zoneLabel, documentName);

      const response = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: 'Tu es un assistant juridique expert en urbanisme français. Réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (!content) return null;

      const parsedRules = JSON.parse(content) as Record<string, unknown>;
      return parsedRules;
    } catch (error) {
      this.logger.warn(`PLU rules extraction failed: ${error.message}`);
      return null;
    }
  }

  private async fetchPdfBuffer(sourceUrl: string): Promise<Buffer | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(sourceUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          maxRedirects: 5,
        }),
      );

      const contentType = (response.headers?.['content-type'] || '').toLowerCase();
      const buffer = Buffer.from(response.data);
      const header = buffer.slice(0, 20).toString('utf8');

      if (contentType.includes('application/pdf') || header.startsWith('%PDF')) {
        return buffer;
      }

      if (contentType.includes('text/html') || header.startsWith('<!DOCTYPE html') || header.startsWith('<html')) {
        const html = buffer.toString('utf8');
        const pdfUrl = this.extractPdfUrlFromHtml(html, sourceUrl);
        if (pdfUrl) {
          const pdfResponse = await firstValueFrom(
            this.httpService.get(pdfUrl, {
              responseType: 'arraybuffer',
              timeout: 20000,
              maxRedirects: 5,
            }),
          );
          return Buffer.from(pdfResponse.data);
        }
      }

      this.logger.warn(`Unsupported PLU document response type for ${sourceUrl} (${contentType})`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch PLU document: ${error.message}`);
      return null;
    }
  }

  private extractPdfUrlFromHtml(html: string, baseUrl: string): string | null {
    const match = html.match(/href\s*=\s*"([^"]+\.pdf)"/i) ||
      html.match(/href\s*=\s*'([^']+\.pdf)'/i) ||
      html.match(/(https?:\/\/[^\s"']+\.pdf)/i);

    if (!match) return null;

    try {
      const candidate = match[1] || match[0];
      const url = new URL(candidate, baseUrl);
      return url.toString();
    } catch {
      return null;
    }
  }

  private extractZoneSection(text: string, zoneCode: string, zoneLabel: string): string {
    const candidates: string[] = [
      `ZONE ${zoneCode}`,
      zoneCode,
      zoneLabel,
    ].filter(Boolean);

    // Try tolerant matching because PDF text extraction often inserts line breaks inside tokens
    for (const candidate of candidates) {
      const re = this.buildLooseTokenRegex(candidate);
      const match = re.exec(text);
      if (match?.index !== undefined) {
        const start = Math.max(0, match.index - 2000);
        return text.slice(start, start + 16000);
      }

      // Fallback: try a looser index-of search on normalized content (useful when the PDF
      // contains unexpected separators that don't match \s)
      const idx = this.findLooseIndex(text, candidate);
      if (idx !== -1) {
        const start = Math.max(0, idx - 2000);
        return text.slice(start, start + 16000);
      }
    }

    return text.slice(0, 16000);
  }

  private findLooseIndex(haystack: string, needle: string): number {
    const h = this.normalizeForSearch(haystack);
    const n = this.normalizeForSearch(needle);
    if (!n) return -1;

    // Direct match
    let idx = h.indexOf(n);
    if (idx !== -1) return idx;

    // If no match, progressively shorten (useful for zone codes like UMeL2p → UMeL2)
    if (n.length >= 6) {
      for (let len = n.length - 1; len >= 4; len--) {
        const sub = n.slice(0, len);
        idx = h.indexOf(sub);
        if (idx !== -1) return idx;
      }
    }

    // Try first significant word (e.g., zone label)
    const firstWord = n.split(' ').find((w) => w.length >= 4);
    if (firstWord) {
      idx = h.indexOf(firstWord);
      if (idx !== -1) return idx;
    }

    return -1;
  }

  private normalizeForSearch(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private buildLooseTokenRegex(input: string): RegExp {
    // Lowercase and keep only alphanumerics, collapse separators
    const cleaned = this.normalizeForSearch(input);

    if (!cleaned) return /$^/;

    // Allow arbitrary whitespace/newlines between characters and words
    const wordPatterns = cleaned.split(/\s+/).map((word) =>
      word
        .split('')
        .map((ch) => ch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join('\\s*')
    );

    return new RegExp(wordPatterns.join('\\s+'), 'i');
  }

  private async getPrimaryDocumentIdByCoordinates(lat: number, lon: number): Promise<string | null> {
    try {
      const geom = JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
      const response = await firstValueFrom(
        this.httpService.get(this.GPU_DOCUMENT_URL, {
          params: { geom },
          timeout: 15000,
        }),
      );

      const features = response.data?.features || [];
      if (!features.length) return null;

      const props = features[0].properties || {};
      // Observed keys: properties.id contains the Geoportail document id
      return props.id || props.gpu_doc_id || null;
    } catch (error) {
      this.logger.warn(`GPU document-by-geom error: ${error.message}`);
      return null;
    }
  }

  private buildPluExtractionPrompt(
    text: string,
    zoneCode: string,
    zoneLabel: string,
    documentName: string | null,
  ): string {
    return `Document: ${documentName || 'PLU'}\nZone: ${zoneCode} (${zoneLabel})\n\nVoici un extrait du règlement du PLU. Extrais les règles structurées au format JSON suivant. Si une information est absente, mets null.\n\nIMPORTANT (EXCEPTIONS PAR TYPE DE PROJET) :\n- Ne confonds pas la règle générale d'implantation des constructions (ex: \"6 m\") avec une exception spécifique (ex: \"piscines : 3 m\").\n- Si tu identifies une règle générale de recul aux limites séparatives, remplis \"reglesGenerales.reculLimitesSeparatives.valeurMetres\".\n- Si tu identifies une exception explicitement liée aux piscines, remplis \"pool.minNeighborSetbackMeters\" avec la valeur de l'exception (souvent PLUS PETITE que la règle générale).\n- Si les deux existent, conserve les deux (générale + exception piscine).\n\nSchéma JSON:\n{\n  \"zoneCode\": \"${zoneCode}\",\n  \"zoneLabel\": \"${zoneLabel}\",\n  \"reglesGenerales\": {\n    \"reculLimitesSeparatives\": { \"valeurMetres\": null },\n    \"reculVoiePublique\": { \"valeurMetres\": null },\n    \"hauteurMaximale\": { \"valeurMetres\": null },\n    \"empriseMaximale\": { \"ratioMax\": null },\n    \"cbsRequired\": null\n  },\n  \"pool\": {\n    \"minNeighborSetbackMeters\": null,\n    \"cbsRequired\": null,\n    \"cbsReference\": null\n  },\n  \"notes\": []\n}\n\nExtrait:\n${text}`;
  }

  private async upsertPluRulesCache(payload: {
    zoneCode: string;
    inseeCode: string;
    rules: Record<string, unknown>;
    sourceUrl: string | null;
    documentName: string | null;
    documentId: string | null;
    documentType: string | null;
    documentDate: string | null;
  }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const rulesWithMeta = {
      ...(payload.rules as object),
      _meta: {
        sourceUrl: payload.sourceUrl,
        documentName: payload.documentName,
        documentId: payload.documentId,
        documentType: payload.documentType,
        documentDate: payload.documentDate,
      },
    };

    await this.prisma.pluZoneCache.upsert({
      where: {
        zoneCode_inseeCode: {
          zoneCode: payload.zoneCode,
          inseeCode: payload.inseeCode,
        },
      },
      create: {
        zoneCode: payload.zoneCode,
        inseeCode: payload.inseeCode,
        rules: rulesWithMeta,
        sourceUrl: payload.sourceUrl,
        expiresAt,
      },
      update: {
        rules: rulesWithMeta,
        sourceUrl: payload.sourceUrl,
        expiresAt,
      },
    });
  }

  private async getCachedZone(parcelId: string): Promise<PluZoneInfo | null> {
    try {
      // Try to find cached zone based on parcel
      // This is a simplified cache - in production you'd want more sophisticated caching
      const cached = await this.prisma.pluZoneCache.findFirst({
        where: {
          zoneCode: {
            not: undefined,
          },
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (cached) {
        const rules = cached.rules as Record<string, unknown>;
        return {
          zoneCode: cached.zoneCode,
          zoneLabel: (rules.zoneLabel as string) || '',
          typezone: (rules.typezone as string) || '',
          inseeCode: cached.inseeCode,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async cacheZone(parcelId: string, zoneInfo: PluZoneInfo): Promise<void> {
    try {
      // Cache for 30 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.prisma.pluZoneCache.upsert({
        where: {
          zoneCode_inseeCode: {
            zoneCode: zoneInfo.zoneCode,
            inseeCode: zoneInfo.inseeCode,
          },
        },
        create: {
          zoneCode: zoneInfo.zoneCode,
          inseeCode: zoneInfo.inseeCode,
          rules: {
            zoneLabel: zoneInfo.zoneLabel,
            typezone: zoneInfo.typezone,
            partition: zoneInfo.partition,
          },
          expiresAt,
        },
        update: {
          rules: {
            zoneLabel: zoneInfo.zoneLabel,
            typezone: zoneInfo.typezone,
            partition: zoneInfo.partition,
          },
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to cache zone: ${error.message}`);
    }
  }
}
