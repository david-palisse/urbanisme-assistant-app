import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

export interface PluZoneInfo {
  zoneCode: string;
  zoneLabel: string;
  typezone: string;
  inseeCode: string;
  communeName?: string;
  partition?: string;
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
  zone: string | null; // Zone 1, 2, 3, 4 (PEB zones)
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

@Injectable()
export class UrbanismeService {
  private readonly logger = new Logger(UrbanismeService.name);
  private readonly GPU_API_URL = 'https://apicarto.ign.fr/api/gpu/zone-urba';
  private readonly GPU_SUP_URL = 'https://apicarto.ign.fr/api/gpu/secteur-cc'; // Not ideal, will use alternative
  private readonly GEORISQUES_API_URL = 'https://www.georisques.gouv.fr/api/v1';
  private readonly GEOPLATEFORME_WFS_URL = 'https://data.geopf.fr/wfs';

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
  ) {}

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
          zones.push({
            zoneCode: zone.libelle || zone.typezone,
            zoneLabel: zone.libelong || zone.libelle || 'Zone non définie',
            typezone: zone.typezone,
            inseeCode: zone.insee || '',
            partition: zone.partition,
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
          zones.push({
            zoneCode: props.libelle || props.typepsc || 'Prescription',
            zoneLabel: props.txt || props.libellong || props.libelle || 'Prescription surfacique',
            typezone: `PSC-${props.typepsc || 'SURF'}`,
            inseeCode: props.insee || '',
            partition: props.partition,
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
          zones.push({
            zoneCode: props.libelle || props.typepsc || 'Prescription linéaire',
            zoneLabel: props.txt || props.libellong || props.libelle || 'Prescription linéaire',
            typezone: `PSC-${props.typepsc || 'LIN'}`,
            inseeCode: props.insee || '',
            partition: props.partition,
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
          zones.push({
            zoneCode: props.libelle || 'Secteur CC',
            zoneLabel: props.libellong || props.libelle || 'Secteur de carte communale',
            typezone: 'SECTEUR-CC',
            inseeCode: props.insee || '',
            partition: props.partition,
          });
        }
      } catch (error) {
        // Secteur CC may not exist for all communes - not an error
        this.logger.debug(`GPU secteur-cc API: ${error.message}`);
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
            // We found a PPR for flood - this is HIGH risk
            // Check if the point is within the PPR perimeter geometry
            const pprName = floodPpr.nom_ppr || 'PPRI';
            const riskClass = floodPpr.risque?.classes_alea?.[0]?.libelle || '';

            // For PPRi in the Vallée du Thouet, the area near the river is typically red zone
            // Since we found a PPR and the commune has flood risk, assume it's a significant risk
            return {
              isInFloodZone: true,
              zoneType: 'rouge', // Default to high risk when PPR exists - precise zone needs geometry intersection
              riskLevel: 'fort',
              sourceName: pprName,
              description: `Zone couverte par un PPRI approuvé. ${riskClass}. Constructions potentiellement interdites ou très réglementées.`,
            };
          }
        } catch (pprError) {
          this.logger.warn(`PPR API call failed: ${pprError.message}`);
        }

        // Fallback if PPR exists but no detailed info
        return {
          isInFloodZone: true,
          zoneType: 'à vérifier',
          riskLevel: 'moyen',
          sourceName: 'GASPAR',
          description: `Commune ${communeName} soumise au risque inondation. Consultez le PPRI local pour connaître votre zone précise.`,
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

      // Zone descriptions based on zone number
      const zoneDescriptions: Record<string, string> = {
        '1': 'Zone A - Très fortement exposée au bruit. Construction interdite.',
        '2': 'Zone B - Fortement exposée au bruit. Construction très réglementée.',
        '3': 'Zone C - Modérément exposée au bruit. Construction sous conditions.',
        '4': 'Zone D - Faiblement exposée au bruit. Attestation acoustique requise.',
      };

      const zone = props.zone || null;
      const restrictions = zone ? zoneDescriptions[zone] || `Zone ${zone} du PEB` : null;

      this.logger.log(`Found PEB zone ${zone} for airport ${props.nom} at coordinates (${lat}, ${lon})`);

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

    return fullInfo;
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
