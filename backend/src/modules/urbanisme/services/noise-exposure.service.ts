import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NoiseExposureInfo } from '../urbanisme.types';

/**
 * Airport noise exposure (PEB - Plan d'Exposition au Bruit) lookups
 * via the GeoPortail WFS service (DGAC PGS data).
 */
@Injectable()
export class NoiseExposureService {
  private readonly logger = new Logger(NoiseExposureService.name);
  private readonly GEOPLATEFORME_WFS_URL = 'https://data.geopf.fr/wfs';

  constructor(private httpService: HttpService) {}

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

  /**
   * Get noise exposure plan (PEB - Plan d'Exposition au Bruit) information
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
}
