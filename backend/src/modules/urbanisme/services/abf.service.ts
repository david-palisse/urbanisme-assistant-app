import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AbfProtectionInfo } from '../urbanisme.types';

/**
 * ABF (Architectes des Bâtiments de France) heritage protection checks
 * via the IGN GPU prescription layers.
 */
@Injectable()
export class AbfService {
  private readonly logger = new Logger(AbfService.name);

  constructor(private httpService: HttpService) {}

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
}
