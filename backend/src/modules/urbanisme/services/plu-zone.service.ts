import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeoJsonGeometry, PluZoneInfo } from '../urbanisme.types';
import { TerritoryService } from './territory.service';

/**
 * PLU zone lookups against the IGN GPU (Géoportail de l'Urbanisme) API,
 * with a Prisma-backed cache.
 */
@Injectable()
export class PluZoneService {
  private readonly logger = new Logger(PluZoneService.name);
  private readonly GPU_API_URL = 'https://apicarto.ign.fr/api/gpu/zone-urba';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private territoryService: TerritoryService,
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
   * Get ALL PLU zones at a given location (returns array instead of single zone)
   * This includes overlapping zones from zone-urba and prescriptions.
   * When the parcel geometry is provided, the whole parcel is intersected:
   * a parcel frequently spans several zones (e.g. UM + N) while the geocoded
   * point only hits one of them (or none, when it falls on the road).
   */
  async getAllPluZonesByCoordinates(
    lat: number,
    lon: number,
    parcelGeometry?: GeoJsonGeometry | null,
  ): Promise<PluZoneInfo[]> {
    const zones: PluZoneInfo[] = [];
    const partitionsToResolve: Set<string> = new Set();

    try {
      const geom = JSON.stringify(
        parcelGeometry || {
          type: 'Point',
          coordinates: [lon, lat],
        },
      );

      // 1. Get main PLU zones (zone-urba)
      try {
        const zoneUrbaResponse = await firstValueFrom(
          this.httpService.get(this.GPU_API_URL, {
            params: { geom },
            timeout: 15000,
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
            timeout: 15000,
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
            timeout: 15000,
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
            timeout: 15000,
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
          const docName = await this.territoryService.getDocumentName(partition);
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

      const uniqueZones = this.dedupeZones(zones);
      this.logger.log(
        `Found ${uniqueZones.length} PLU zones/prescriptions at coordinates (${lat}, ${lon})`,
      );
      return uniqueZones;
    } catch (error) {
      this.logger.error(`getAllPluZonesByCoordinates error: ${error.message}`);
      return this.dedupeZones(zones); // Return whatever we managed to collect
    }
  }

  /**
   * A parcel polygon can intersect several features of the same zone
   * (adjacent polygons of one zoning); keep one entry per zone.
   */
  private dedupeZones(zones: PluZoneInfo[]): PluZoneInfo[] {
    const seen = new Set<string>();
    return zones.filter((zone) => {
      const key = `${zone.typezone}|${zone.zoneCode}|${zone.partition || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
