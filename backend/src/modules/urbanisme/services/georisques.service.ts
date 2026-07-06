import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FloodZoneInfo, NaturalRisksInfo } from '../urbanisme.types';

/**
 * Flood zone (PPRI) and natural risks lookups against the Géorisques API.
 */
@Injectable()
export class GeorisquesService {
  private readonly logger = new Logger(GeorisquesService.name);
  private readonly GEORISQUES_API_URL = 'https://www.georisques.gouv.fr/api/v1';

  constructor(private httpService: HttpService) {}

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
}
