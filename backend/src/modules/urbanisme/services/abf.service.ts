import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AbfProtectionInfo, GeoJsonGeometry } from '../urbanisme.types';

/**
 * ABF (Architectes des Bâtiments de France) heritage protection checks.
 *
 * The authoritative source is the SUP (servitudes d'utilité publique)
 * "assiettes" published on the Géoportail de l'Urbanisme:
 *  - AC1: abords des monuments historiques (500m perimeter or PDA)
 *  - AC2: sites classés / inscrits
 *  - AC4: sites patrimoniaux remarquables (ex AVAP/ZPPAUP)
 * The query is made with the parcel polygon when available: the geocoded
 * address point frequently sits just outside a perimeter that does cover
 * the parcel.
 */
@Injectable()
export class AbfService {
  private readonly logger = new Logger(AbfService.name);
  private readonly GPU_SUP_URL = 'https://apicarto.ign.fr/api/gpu/assiette-sup-s';
  private readonly GPU_PRESCRIPTION_URL = 'https://apicarto.ign.fr/api/gpu/prescription-surf';

  constructor(private httpService: HttpService) {}

  /**
   * Check if location is within ABF (Architectes des Bâtiments de France) protection zone
   * This includes: Monuments Historiques (500m perimeter), SPR, AVAP, ZPPAUP
   */
  async getAbfProtectionInfo(
    lat: number,
    lon: number,
    parcelGeometry?: GeoJsonGeometry | null,
  ): Promise<AbfProtectionInfo> {
    const geom = JSON.stringify(
      parcelGeometry || { type: 'Point', coordinates: [lon, lat] },
    );

    try {
      const supInfo = await this.checkSupAssiettes(geom);
      if (supInfo) {
        return supInfo;
      }

      const prescriptionInfo = await this.checkHeritagePrescriptions(geom);
      if (prescriptionInfo) {
        return prescriptionInfo;
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
   * Check the SUP assiettes (AC1/AC2/AC4) intersecting the geometry.
   */
  private async checkSupAssiettes(geom: string): Promise<AbfProtectionInfo | null> {
    const response = await firstValueFrom(
      this.httpService.get(this.GPU_SUP_URL, {
        params: { geom },
        timeout: 10000,
      }),
    );

    const features = response.data?.features || [];
    let best: AbfProtectionInfo | null = null;

    for (const feature of features) {
      const props = feature.properties || {};
      const suptype = (props.suptype || '').toLowerCase();
      const name = this.cleanSupName(props.nomass || props.nomsuplitt || '');

      if (suptype === 'ac1') {
        // MH is the strongest signal, return immediately
        return {
          isProtected: true,
          protectionType: 'MH',
          perimeterDescription:
            'Périmètre de protection des abords d\'un monument historique (servitude AC1)',
          monumentName: name || 'Monument historique à proximité',
          distance: null,
        };
      }

      if (suptype === 'ac4' && !best) {
        best = {
          isProtected: true,
          protectionType: 'SPR',
          perimeterDescription:
            'Site Patrimonial Remarquable (servitude AC4, ex AVAP/ZPPAUP)',
          monumentName: name || null,
          distance: null,
        };
      }

      if (suptype === 'ac2' && !best) {
        best = {
          isProtected: true,
          protectionType: 'Site',
          perimeterDescription: 'Site classé ou inscrit (servitude AC2)',
          monumentName: name || null,
          distance: null,
        };
      }
    }

    return best;
  }

  /**
   * Fallback: some documents carry heritage protections as PLU prescriptions
   * rather than published SUP.
   */
  private async checkHeritagePrescriptions(geom: string): Promise<AbfProtectionInfo | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.GPU_PRESCRIPTION_URL, {
          params: { geom },
          timeout: 10000,
        }),
      );

      const features = response.data?.features || [];

      for (const feature of features) {
        const props = feature.properties || {};
        const libelle = (props.libelle || '').toLowerCase();
        const libellong = (props.libellong || '').toLowerCase();

        if (
          libelle.includes('monument') ||
          libelle.includes('abf') ||
          libelle.includes('périmètre de protection') ||
          libellong.includes('monument historique')
        ) {
          return {
            isProtected: true,
            protectionType: 'MH',
            perimeterDescription:
              'Périmètre de protection de 500m autour d\'un monument historique',
            monumentName: props.txt || props.libelle || 'Monument historique à proximité',
            distance: null,
          };
        }

        if (libelle.includes('site patrimonial') || libelle.includes('spr')) {
          return {
            isProtected: true,
            protectionType: 'SPR',
            perimeterDescription: 'Site Patrimonial Remarquable',
            monumentName: props.txt || null,
            distance: null,
          };
        }

        if (libelle.includes('avap') || libelle.includes('zppaup')) {
          return {
            isProtected: true,
            protectionType: libelle.includes('avap') ? 'AVAP' : 'ZPPAUP',
            perimeterDescription:
              'Aire de mise en Valeur de l\'Architecture et du Patrimoine',
            monumentName: null,
            distance: null,
          };
        }
      }
    } catch (error) {
      this.logger.warn(`GPU prescription-surf ABF check failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Turn a GPU SUP technical name like
   * "AC1_Les-deux-pavillons-de-la-porterie-de-lhopital-IRT7SU_abor"
   * into a readable label.
   */
  private cleanSupName(rawName: string): string {
    return rawName
      .replace(/^AC\d_/i, '')
      .replace(/_(abor|gen|act|ass)$/i, '')
      .replace(/-[A-Z0-9]{6}$/, '')
      .replace(/-/g, ' ')
      .trim();
  }
}
