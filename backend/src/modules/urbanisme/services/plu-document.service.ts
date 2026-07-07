import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PluDocumentFile, PluDocumentInfo } from '../urbanisme.types';

/**
 * Lists downloadable urban planning documents (PLU/PLUi/PSMV/CC) covering a
 * location, with direct file URLs from the Geoportail de l'Urbanisme API.
 */
@Injectable()
export class PluDocumentService {
  private readonly logger = new Logger(PluDocumentService.name);
  private readonly GPU_DOCUMENT_URL = 'https://apicarto.ign.fr/api/gpu/document';
  private readonly GEOPORTAIL_API_URL = 'https://www.geoportail-urbanisme.gouv.fr/api';

  // In-memory cache of document details (documents change rarely)
  private documentCache: Map<string, { info: PluDocumentInfo; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  constructor(private httpService: HttpService) {}

  /**
   * Get all urban planning documents covering a coordinate, with their
   * downloadable files (règlement, rapport, annexes...) and full archive URL.
   */
  async getPluDocumentsByCoordinates(lat: number, lon: number): Promise<PluDocumentInfo[]> {
    const documentIds = await this.getDocumentIdsByCoordinates(lat, lon);
    if (documentIds.length === 0) return [];

    const documents = await Promise.all(
      documentIds.map((id) => this.getDocumentInfo(id)),
    );

    return documents.filter((doc): doc is PluDocumentInfo => doc !== null);
  }

  private async getDocumentIdsByCoordinates(lat: number, lon: number): Promise<string[]> {
    try {
      const geom = JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
      const response = await firstValueFrom(
        this.httpService.get(this.GPU_DOCUMENT_URL, {
          params: { geom },
          timeout: 15000,
        }),
      );

      const features = response.data?.features || [];
      const ids = new Set<string>();
      for (const feature of features) {
        const id = feature?.properties?.gpu_doc_id || feature?.properties?.id;
        if (id) ids.add(id);
      }
      return Array.from(ids);
    } catch (error) {
      this.logger.warn(`GPU document-by-geom error: ${error.message}`);
      return [];
    }
  }

  private async getDocumentInfo(documentId: string): Promise<PluDocumentInfo | null> {
    const cached = this.documentCache.get(documentId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.info;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.GEOPORTAIL_API_URL}/document/${documentId}/details`, {
          timeout: 15000,
        }),
      );

      const details = response.data;
      if (!details) return null;

      const info: PluDocumentInfo = {
        documentId,
        name: details.name || details.originalName || documentId,
        title: details.title || details.name || 'Document d\'urbanisme',
        type: details.type || 'PLU',
        archiveUrl: typeof details.archiveUrl === 'string' ? details.archiveUrl : null,
        files: this.extractFiles(details),
      };

      this.documentCache.set(documentId, {
        info,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return info;
    } catch (error) {
      this.logger.warn(`Geoportail details error for ${documentId}: ${error.message}`);
      return null;
    }
  }

  private extractFiles(details: any): PluDocumentFile[] {
    const writingMaterials = details?.writingMaterials;
    if (!writingMaterials || typeof writingMaterials !== 'object') return [];

    const files: PluDocumentFile[] = [];
    for (const [name, url] of Object.entries(writingMaterials)) {
      if (typeof name !== 'string' || typeof url !== 'string') continue;
      files.push({
        name,
        url,
        category: this.categorizeFile(name),
      });
    }

    // Règlement écrit first, then graphic rules, report, annexes, misc
    const categoryOrder: Record<PluDocumentFile['category'], number> = {
      reglement: 0,
      reglement_graphique: 1,
      rapport: 2,
      procedure: 3,
      annexe: 4,
      autre: 5,
    };
    files.sort(
      (a, b) =>
        categoryOrder[a.category] - categoryOrder[b.category] ||
        a.name.localeCompare(b.name),
    );

    return files;
  }

  private categorizeFile(filename: string): PluDocumentFile['category'] {
    const lower = filename.toLowerCase();
    if (lower.includes('reglement')) {
      return lower.includes('graphique') ? 'reglement_graphique' : 'reglement';
    }
    if (lower.includes('rapport')) return 'rapport';
    if (lower.includes('annexe')) return 'annexe';
    if (lower.includes('procedure')) return 'procedure';
    return 'autre';
  }
}
