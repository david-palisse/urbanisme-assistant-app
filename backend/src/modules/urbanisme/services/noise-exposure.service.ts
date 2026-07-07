import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NoiseExposureInfo } from '../urbanisme.types';

/**
 * Airport noise exposure (PEB - Plan d'Exposition au Bruit) lookups.
 *
 * Uses the Géoplateforme vector WMS layer "dgac_peb_plan_wmsv" (DGAC PEB
 * zone polygons) through GetFeatureInfo. The previously used WFS layer
 * (DGAC-PGS_BDD_FXX_WM) was the much smaller PGS and has been removed from
 * the Géoplateforme, which made every lookup fail silently.
 */
@Injectable()
export class NoiseExposureService {
  private readonly logger = new Logger(NoiseExposureService.name);
  private readonly GEOPLATEFORME_WMSV_URL = 'https://data.geopf.fr/wms-v/ows';
  private readonly PEB_LAYER = 'dgac_peb_plan_wmsv';
  // The layer only answers GetFeatureInfo below ~1:25000, so the query
  // window must stay wide enough (±0.05° with 1000px ≈ 11m per pixel).
  private readonly BBOX_HALF_WIDTH = 0.05;
  private readonly IMAGE_SIZE = 1000;

  constructor(private httpService: HttpService) {}

  /**
   * Get noise exposure plan (PEB - Plan d'Exposition au Bruit) information
   */
  async getNoiseExposureInfo(lat: number, lon: number): Promise<NoiseExposureInfo> {
    try {
      const d = this.BBOX_HALF_WIDTH;
      const response = await firstValueFrom(
        this.httpService.get(this.GEOPLATEFORME_WMSV_URL, {
          params: {
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetFeatureInfo',
            LAYERS: this.PEB_LAYER,
            QUERY_LAYERS: this.PEB_LAYER,
            CRS: 'EPSG:4326',
            // WMS 1.3.0 + EPSG:4326 expects lat,lon axis order
            BBOX: `${lat - d},${lon - d},${lat + d},${lon + d}`,
            WIDTH: this.IMAGE_SIZE,
            HEIGHT: this.IMAGE_SIZE,
            I: this.IMAGE_SIZE / 2,
            J: this.IMAGE_SIZE / 2,
            INFO_FORMAT: 'application/json',
            FEATURE_COUNT: 10,
            STYLES: '',
          },
          timeout: 15000,
        }),
      );

      const features = response.data?.features || [];

      if (features.length === 0) {
        return this.notInNoiseZone();
      }

      // Overlapping features are possible; keep the most restrictive zone (A > B > C > D)
      const feature = features.reduce((mostRestrictive: any, current: any) => {
        const rank = (f: any) => {
          const zone = this.normalizeZone(f?.properties?.zone);
          const order: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
          return zone !== null && zone in order ? order[zone] : 99;
        };
        return rank(current) < rank(mostRestrictive) ? current : mostRestrictive;
      });

      const props = feature.properties || {};
      const zone = this.normalizeZone(props.zone);

      // Zone descriptions based on letter zone
      const zoneDescriptions: Record<string, string> = {
        'A': 'Zone A - Très fortement exposée au bruit. Construction interdite.',
        'B': 'Zone B - Fortement exposée au bruit. Construction très réglementée.',
        'C': 'Zone C - Modérément exposée au bruit. Construction sous conditions.',
        'D': 'Zone D - Faiblement exposée au bruit. Attestation acoustique requise.',
      };

      const restrictions = zone ? zoneDescriptions[zone] || `Zone ${zone} du PEB` : null;

      this.logger.log(
        `Found PEB zone ${zone} for airport ${props.nom} at coordinates (${lat}, ${lon})`,
      );

      return {
        isInNoiseZone: true,
        zone: zone,
        airportName: props.nom || null,
        airportCode: props.code_oaci || props.oaci || null,
        indiceLden: this.parseIndice(props.indldenext),
        indiceLn: this.parseIndice(props.indldenint),
        approvalDate: props.date_arret || null,
        documentRef: props.ref_doc || null,
        restrictions: restrictions,
      };
    } catch (error) {
      this.logger.error(`Noise exposure (PEB) API error: ${error.message}`);
      return {
        ...this.notInNoiseZone(),
        restrictions: 'Impossible de vérifier - consultez le PEB local',
      };
    }
  }

  private notInNoiseZone(): NoiseExposureInfo {
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

  /**
   * The layer serves letter zones (A-D); older data may use numeric codes.
   */
  private normalizeZone(rawZone: unknown): string | null {
    if (rawZone === null || rawZone === undefined || rawZone === '') {
      return null;
    }
    const numericToLetterZone: Record<string, string> = {
      '1': 'A',
      '2': 'B',
      '3': 'C',
      '4': 'D',
    };
    const zone = String(rawZone).toUpperCase();
    return numericToLetterZone[zone] || zone;
  }

  private parseIndice(value: unknown): number | null {
    const parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
}
