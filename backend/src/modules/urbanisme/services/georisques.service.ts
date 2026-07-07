import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FloodZoneInfo, NaturalRisksInfo } from '../urbanisme.types';

interface SamplePoint {
  lat: number;
  lon: number;
}

interface PprZoneFeature {
  nomPpr: string | null;
  libelleZone: string | null;
  codeZone: string | null;
  etat: string | null;
}

/**
 * Flood zone and natural risks lookups against Géorisques.
 *
 * Flood exposure is resolved at parcel level with the regulatory PPR zoning
 * layers (PPRN_ZONE_INOND / PPRN_ZONE_SUBMAR) of the Géorisques WMS, then
 * with the indicative EAIP envelope combined with the communal AZI. The
 * previous implementation only used commune-level GASPAR data and hardcoded
 * "zone rouge / risque fort" whenever the commune had any flood PPR, which
 * produced false positives.
 */
@Injectable()
export class GeorisquesService {
  private readonly logger = new Logger(GeorisquesService.name);
  private readonly GEORISQUES_API_URL = 'https://www.georisques.gouv.fr/api/v1';
  private readonly GEORISQUES_WMS_URL = 'https://mapsref.brgm.fr/wxs/georisques/risques';
  private readonly PPR_ZONE_LAYERS = 'PPRN_ZONE_INOND,PPRN_ZONE_SUBMAR';
  private readonly EAIP_LAYERS = 'EAIP_CE,EAIP_SM';

  constructor(private httpService: HttpService) {}

  /**
   * Get flood zone information. `samplePoints` should cover the parcel
   * (centroid + extreme vertices); it defaults to the address point.
   */
  async getFloodZoneInfo(
    lat: number,
    lon: number,
    samplePoints?: SamplePoint[],
  ): Promise<FloodZoneInfo> {
    const points = samplePoints?.length ? samplePoints.slice(0, 5) : [{ lat, lon }];

    try {
      // 1. Regulatory PPR flood zoning at parcel level
      const pprZone = await this.queryPprZones(points);
      if (pprZone) {
        const riskLevel = this.deriveRiskLevel(pprZone);
        return {
          isInFloodZone: true,
          zoneType: pprZone.libelleZone || pprZone.codeZone || 'zone réglementée',
          riskLevel,
          sourceName: pprZone.nomPpr || 'PPRI',
          description:
            `Terrain situé dans le zonage réglementaire du ${pprZone.nomPpr || 'PPRI'}` +
            (pprZone.libelleZone ? ` (${pprZone.libelleZone})` : '') +
            (pprZone.etat ? ` - document ${pprZone.etat.toLowerCase()}` : '') +
            '. Consultez le règlement du PPR pour les contraintes applicables.',
        };
      }

      // 2. Indicative sources: EAIP envelope + communal flood atlas (AZI)
      const [inEaip, azi] = await Promise.all([
        this.isInEaip(points),
        this.getAziForLocation(lat, lon),
      ]);

      if (inEaip && azi) {
        return {
          isInFloodZone: true,
          zoneType: 'zone potentiellement inondable (AZI/EAIP)',
          riskLevel: 'à confirmer',
          sourceName: azi,
          description:
            `Terrain situé dans l'enveloppe approchée des inondations potentielles et couvert par ` +
            `l'atlas des zones inondables "${azi}". Zonage indicatif (non réglementaire) : ` +
            'vérifiez auprès de la commune les contraintes applicables.',
        };
      }

      // 3. Commune-level information only: do not label the parcel as flood zone
      const communeInfo = await this.getCommuneFloodInfo(lat, lon);
      if (communeInfo) {
        return {
          isInFloodZone: false,
          zoneType: null,
          riskLevel: null,
          sourceName: 'GASPAR',
          description: `Commune ${communeInfo} soumise au risque inondation, mais le terrain n'est pas situé dans un zonage inondable connu. Vérifier le PPRI local pour confirmer.`,
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
      this.logger.error(`Géorisques flood zone error: ${error.message}`);
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
   * GetFeatureInfo on the regulatory PPR flood zoning layers for each sample
   * point; returns the most severe intersected zone, or null.
   */
  private async queryPprZones(points: SamplePoint[]): Promise<PprZoneFeature | null> {
    const results = await Promise.all(
      points.map((p) => this.getFeatureInfo(this.PPR_ZONE_LAYERS, p)),
    );

    const zones: PprZoneFeature[] = results.flat().map((props) => ({
      nomPpr: props['nom_ppr'] || null,
      libelleZone: props['libelle_zone'] || null,
      codeZone: props['code_zone_reg'] || null,
      etat: props['etat'] || null,
    }));

    if (zones.length === 0) {
      return null;
    }

    const severity = (z: PprZoneFeature) => {
      const level = this.deriveRiskLevel(z);
      if (level === 'fort') return 0;
      if (level === 'moyen') return 1;
      if (level === 'faible') return 2;
      return 3;
    };
    return zones.reduce((worst, z) => (severity(z) < severity(worst) ? z : worst));
  }

  private async isInEaip(points: SamplePoint[]): Promise<boolean> {
    const results = await Promise.all(
      points.map((p) => this.getFeatureInfo(this.EAIP_LAYERS, p)),
    );
    return results.some((features) => features.length > 0);
  }

  /**
   * AZI (atlas des zones inondables) covering the commune, if any.
   */
  private async getAziForLocation(lat: number, lon: number): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.GEORISQUES_API_URL}/gaspar/azi`, {
          params: {
            latlon: `${lon},${lat}`,
            rayon: 1000,
          },
          timeout: 10000,
        }),
      );

      const data = response.data?.data || [];
      const flood = data.find((azi: any) =>
        (azi.liste_libelle_risque || []).some(
          (r: any) =>
            r.num_risque === '11' ||
            r.libelle_risque_long?.toLowerCase().includes('inondation'),
        ),
      );
      return flood?.libelle_azi || null;
    } catch (error) {
      this.logger.warn(`Géorisques AZI API error: ${error.message}`);
      return null;
    }
  }

  private async getCommuneFloodInfo(lat: number, lon: number): Promise<string | null> {
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
      for (const commune of data) {
        const risks = commune.risques_detail || commune.risques || [];
        const hasFlood = risks.some(
          (r: any) =>
            r.num_risque === '11' ||
            r.code_risque === '11' ||
            (r.libelle_risque_long || r.libelle_risque || '')
              .toLowerCase()
              .includes('inondation'),
        );
        if (hasFlood) {
          return commune.libelle_commune || '';
        }
      }
      return null;
    } catch (error) {
      this.logger.warn(`Géorisques GASPAR API error: ${error.message}`);
      return null;
    }
  }

  /**
   * WMS 1.1.1 GetFeatureInfo on the Géorisques MapServer (GML output; the
   * server does not support JSON). Returns the properties of each feature
   * found at the point. The server occasionally hangs, so a failed or
   * timed-out call is retried once (an empty result is a valid answer and
   * is not retried).
   */
  private async getFeatureInfo(
    layers: string,
    point: SamplePoint,
  ): Promise<Array<Record<string, string>>> {
    const d = 0.01;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(this.GEORISQUES_WMS_URL, {
            params: {
              SERVICE: 'WMS',
              VERSION: '1.1.1',
              REQUEST: 'GetFeatureInfo',
              LAYERS: layers,
              QUERY_LAYERS: layers,
              SRS: 'EPSG:4326',
              BBOX: `${point.lon - d},${point.lat - d},${point.lon + d},${point.lat + d}`,
              WIDTH: 500,
              HEIGHT: 500,
              X: 250,
              Y: 250,
              INFO_FORMAT: 'application/vnd.ogc.gml',
              FEATURE_COUNT: 10,
              STYLES: '',
            },
            responseType: 'text',
            timeout: 8000,
          }),
        );

        const body = String(response.data);
        if (body.includes('ServiceException')) {
          throw new Error('WMS ServiceException');
        }
        return this.parseGmlFeatures(body);
      } catch (error) {
        this.logger.warn(
          `Géorisques WMS GetFeatureInfo error (${layers}, attempt ${attempt}): ${error.message}`,
        );
      }
    }
    return [];
  }

  private parseGmlFeatures(gml: string): Array<Record<string, string>> {
    const features: Array<Record<string, string>> = [];
    const featureRegex = /<(\w+)_feature>([\s\S]*?)<\/\1_feature>/g;
    let match: RegExpExecArray | null;

    while ((match = featureRegex.exec(gml)) !== null) {
      const props: Record<string, string> = {};
      const propRegex = /<([a-zA-Z_][\w]*)>([^<]*)<\/\1>/g;
      let propMatch: RegExpExecArray | null;
      while ((propMatch = propRegex.exec(match[2])) !== null) {
        if (!propMatch[1].startsWith('gml')) {
          props[propMatch[1]] = this.decodeXmlEntities(propMatch[2].trim());
        }
      }
      features.push(props);
    }

    return features;
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private deriveRiskLevel(zone: PprZoneFeature): string | null {
    const text = `${zone.libelleZone || ''} ${zone.codeZone || ''}`.toLowerCase();
    if (/rouge|fort|h\s*>\s*1/.test(text)) return 'fort';
    if (/orange|moyen/.test(text)) return 'moyen';
    if (/bleu|faible/.test(text)) return 'faible';
    return null;
  }
}
