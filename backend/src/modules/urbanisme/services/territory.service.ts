import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Resolves human-readable names for territories and urban planning documents
 * using geo.api.gouv.fr (communes, EPCIs).
 */
@Injectable()
export class TerritoryService {
  private readonly logger = new Logger(TerritoryService.name);
  private readonly GEO_API_URL = 'https://geo.api.gouv.fr';

  // Cache for document names and EPCI names to avoid repeated API calls
  private documentNameCache: Map<string, string> = new Map();
  private epciNameCache: Map<string, string> = new Map();

  // Document type labels - single source of truth
  private readonly DOC_TYPE_LABELS: Record<string, string> = {
    'PLU': 'PLU',
    'PLUI': 'PLUi',
    'PSMV': 'PSMV',
    'POS': 'POS',
    'CC': 'Carte Communale',
    'RNU': 'RNU',
  };

  constructor(private httpService: HttpService) {}

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

      // Determine document type label
      const typeLabel = this.DOC_TYPE_LABELS[partitionType] ||
                       (partitionType === 'DU' ? (isIntercommunal ? 'PLUi' : 'PLU') : partitionType);

      // The API already returns proper names like "CC du Thouarsais" or "Nantes Métropole",
      // so we just prepend the document type
      const documentName = `${typeLabel} ${territoryName}`;

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
}
