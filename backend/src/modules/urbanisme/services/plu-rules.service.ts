import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../../prisma/prisma.service';
import { PluZoneService } from './plu-zone.service';
const pdfParse = require('pdf-parse');

/**
 * Extraction of written PLU regulations: downloads the règlement PDF from
 * Geoportail Urbanisme and extracts structured rules with an LLM, with a
 * Prisma-backed cache.
 */
@Injectable()
export class PluRulesService {
  private readonly logger = new Logger(PluRulesService.name);
  private readonly GPU_DOCUMENT_URL = 'https://apicarto.ign.fr/api/gpu/document';

  private openai: OpenAI | null = null;
  private openaiModel: string = 'gpt-4o';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private pluZoneService: PluZoneService,
  ) {
    const apiKey =
      this.configService.get<string>('openai.apiKey') ||
      process.env.OPENAI_API_KEY;
    this.openaiModel =
      this.configService.get<string>('openai.model') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o';

    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async getPluRuleset(
    inseeCode: string | null,
    zoneCode: string | null,
    documentName: string | null,
    projectType?: string | null,
    lat?: number,
    lon?: number,
  ): Promise<Record<string, unknown> | null> {
    if (!inseeCode || !zoneCode) return null;

    if (!lat || !lon) return null;

    const zones = await this.pluZoneService.getAllPluZonesByCoordinates(lat, lon);
    const zone = zones.find((z) => z.zoneCode === zoneCode) || zones[0];

    if (!zone) return null;

    // Use Geoportail Urbanisme details API to get a stable, downloadable PDF for the written regulation.
    const gpuDocumentId = zone.documentId || (await this.getPrimaryDocumentIdByCoordinates(lat, lon));
    this.logger.debug(`PLU document id for ${inseeCode}/${zoneCode}: ${gpuDocumentId || 'null'}`);
    const details = gpuDocumentId
      ? await this.getGeoportailDocumentDetails(gpuDocumentId)
      : null;

    const reglementUrl = details
      ? this.selectReglementWrittenMaterialUrl(details)
      : null;

    this.logger.debug(`PLU reglement URL selected for ${inseeCode}/${zoneCode}: ${reglementUrl || 'null'}`);

    const rules = await this.extractPluRulesFromDocument(
      reglementUrl,
      zone.zoneCode,
      zone.zoneLabel,
      documentName || zone.documentName || null,
      projectType || null,
    );

    await this.upsertPluRulesCache({
      zoneCode: zone.zoneCode,
      // Prefer the INSEE code from BAN (address) because GPU sometimes returns null/empty
      inseeCode: inseeCode,
      rules: rules || {},
      sourceUrl: reglementUrl,
      documentName: documentName || zone.documentName || null,
      documentId: gpuDocumentId || null,
      documentType: (details && (details.type || details.documentType)) || null,
      documentDate: (details && (details.approbationDate || details.publicationDate || details.statusDate)) || null,
    });

    return rules;
  }

  /**
   * Resolve the downloadable règlement PDF URL for a Geoportail Urbanisme
   * document id. Reuses the same selection logic as the LLM extraction path.
   */
  async getPluDocumentDownloadUrl(documentId: string): Promise<string | null> {
    const details = await this.getGeoportailDocumentDetails(documentId);
    return details ? this.selectReglementWrittenMaterialUrl(details) : null;
  }

  private async getGeoportailDocumentDetails(documentId: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://www.geoportail-urbanisme.gouv.fr/api/document/${documentId}/details`,
          { timeout: 15000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`Geoportail details error for ${documentId}: ${error.message}`);
      return null;
    }
  }

  private selectReglementWrittenMaterialUrl(details: any): string | null {
    const writingMaterials = details?.writingMaterials;
    if (!writingMaterials || typeof writingMaterials !== 'object') return null;

    const entries = Object.entries(writingMaterials) as Array<[string, string]>;

    const reglementCandidates = entries
      .filter(([filename, url]) =>
        typeof filename === 'string' &&
        typeof url === 'string' &&
        filename.toLowerCase().includes('reglement') &&
        filename.toLowerCase().endsWith('.pdf') &&
        !filename.toLowerCase().includes('graphique')
      )
      .map(([, url]) => url);

    if (reglementCandidates.length > 0) return reglementCandidates[0];

    // Fallback: any PDF in written materials
    const anyPdf = entries.find(([filename, url]) =>
      typeof filename === 'string' &&
      typeof url === 'string' &&
      filename.toLowerCase().endsWith('.pdf')
    );

    return anyPdf?.[1] || null;
  }

  private async extractPluRulesFromDocument(
    sourceUrl: string | null,
    zoneCode: string,
    zoneLabel: string,
    documentName: string | null,
    projectType: string | null,
  ): Promise<Record<string, unknown> | null> {
    if (!sourceUrl || !this.openai) return null;

    try {
      const pdfBuffer = await this.fetchPdfBuffer(sourceUrl);
      if (!pdfBuffer) return null;

      // Preferred path (when supported by the SDK / API): pass the PDF as a file input to the model.
      // This preserves layout cues (tables, headings, article structure) that are often lost in plain text extraction.
      const fromPdfInput = await this.tryExtractPluRulesWithPdfInput({
        pdfBuffer,
        zoneCode,
        zoneLabel,
        documentName,
        projectType,
      });
      if (fromPdfInput) return fromPdfInput;

      const parsed = await pdfParse(pdfBuffer);
      const text = parsed.text || '';

      if (!text) return null;

      const prompt = this.buildPluExtractionPrompt(
        this.truncateTextForPrompt(text),
        zoneCode,
        zoneLabel,
        documentName,
        projectType,
      );

      const response = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: 'Tu es un assistant juridique expert en urbanisme français. Réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (!content) return null;

      const parsedRules = JSON.parse(content) as Record<string, unknown>;
      return parsedRules;
    } catch (error) {
      this.logger.warn(`PLU rules extraction failed: ${error.message}`);
      return null;
    }
  }

  private async fetchPdfBuffer(sourceUrl: string): Promise<Buffer | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(sourceUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          maxRedirects: 5,
        }),
      );

      const contentType = (response.headers?.['content-type'] || '').toLowerCase();
      const buffer = Buffer.from(response.data);
      const header = buffer.slice(0, 20).toString('utf8');

      if (contentType.includes('application/pdf') || header.startsWith('%PDF')) {
        return buffer;
      }

      if (contentType.includes('text/html') || header.startsWith('<!DOCTYPE html') || header.startsWith('<html')) {
        const html = buffer.toString('utf8');
        const pdfUrl = this.extractPdfUrlFromHtml(html, sourceUrl);
        if (pdfUrl) {
          const pdfResponse = await firstValueFrom(
            this.httpService.get(pdfUrl, {
              responseType: 'arraybuffer',
              timeout: 20000,
              maxRedirects: 5,
            }),
          );
          return Buffer.from(pdfResponse.data);
        }
      }

      this.logger.warn(`Unsupported PLU document response type for ${sourceUrl} (${contentType})`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch PLU document: ${error.message}`);
      return null;
    }
  }

  private extractPdfUrlFromHtml(html: string, baseUrl: string): string | null {
    const match = html.match(/href\s*=\s*"([^"]+\.pdf)"/i) ||
      html.match(/href\s*=\s*'([^']+\.pdf)'/i) ||
      html.match(/(https?:\/\/[^\s"']+\.pdf)/i);

    if (!match) return null;

    try {
      const candidate = match[1] || match[0];
      const url = new URL(candidate, baseUrl);
      return url.toString();
    } catch {
      return null;
    }
  }

  private async getPrimaryDocumentIdByCoordinates(lat: number, lon: number): Promise<string | null> {
    try {
      const geom = JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
      const response = await firstValueFrom(
        this.httpService.get(this.GPU_DOCUMENT_URL, {
          params: { geom },
          timeout: 15000,
        }),
      );

      const features = response.data?.features || [];
      if (!features.length) return null;

      const props = features[0].properties || {};
      // Observed keys: properties.id contains the Geoportail document id
      return props.id || props.gpu_doc_id || null;
    } catch (error) {
      this.logger.warn(`GPU document-by-geom error: ${error.message}`);
      return null;
    }
  }

  private buildPluExtractionPrompt(
    text: string,
    zoneCode: string,
    zoneLabel: string,
    documentName: string | null,
    projectType: string | null,
  ): string {
    return `Tu dois extraire des règles d'urbanisme applicables à un projet, à partir d'un règlement de PLU/PLUi (document PDF converti en texte).

Contexte:
- Document: ${documentName || 'PLU'}
- Zone: ${zoneCode} (${zoneLabel})
- Type de projet: ${projectType || 'NON RENSEIGNE'}

OBJECTIF (très important):
1) Extraire les règles générales de la zone (implantation, emprise, hauteur, stationnement, aspect, espaces verts, etc.)
2) Extraire et SURTOUT prioriser les exceptions/variantes spécifiques au type de projet (ex: piscine vs extension)
3) Quand une règle générale et une exception coexistent, tu dois retenir l'exception applicable au type de projet.

HIÉRARCHIE ET HÉRITAGE DES RÈGLES (OBLIGATOIRE)
- Pour une zone donnée (ex: UMeL2p), appliquer les règles selon cette cascade:
  1) règles explicitement pour UMeL2p
  2) sinon règles pour UMeL
  3) sinon règles pour UMe
  4) sinon règles générales (si présentes dans les extraits)
- Une règle parente s'applique tant qu'aucun extrait fourni ne montre une dérogation/exception pour la sous-zone.
- Si tu appliques une règle héritée, tu dois:
  a) indiquer "inheritedFrom" (exemple: "UMe")

Contraintes de sortie:
- Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas d'explication).
- Structure attendue (tu peux ajouter des champs si utile):
{
  "projectType": string,
  "zone": { "code": string, "label": string },
  "rules": {
    "implantation": {},
    "height": {},
    "footprint": {},
    "setbacks": {},
    "parking": {},
    "landscaping": {},
    "appearance": {},
    "other": {}
  },
  "inheritedFrom": "",
  "projectTypeSpecific": {
    "overrides": [],
    "notes": []
  },
  "warnings": []
}

IMPORTANT:
- Si l'information est absente/ambiguë dans l'extrait fourni, mets null et ajoute une entrée dans warnings.
- N'invente pas. Base-toi uniquement sur le contenu fourni.

EXTRAIT DU REGLEMENT (texte):
${text}`;
  }

  private truncateTextForPrompt(text: string, maxChars: number = 1_000_000): string {
    if (!text) return '';
    if (text.length <= maxChars) return text;

    // Keep both the beginning and the end, as PLU documents often have zone-specific articles later.
    const headSize = Math.floor(maxChars * 0.7);
    const tailSize = maxChars - headSize;

    const head = text.slice(0, headSize);
    const tail = text.slice(-tailSize);

    return `${head}\n\n[...TRUNCATED ${text.length - maxChars} CHARS...]\n\n${tail}`;
  }

  private async tryExtractPluRulesWithPdfInput(payload: {
    pdfBuffer: Buffer;
    zoneCode: string;
    zoneLabel: string;
    documentName: string | null;
    projectType: string | null;
  }): Promise<Record<string, unknown> | null> {
    if (!this.openai) return null;

    // openai@4.24.x may not expose the Responses API typings; use a runtime capability check.
    const openaiAny = this.openai as any;
    const responses = openaiAny?.responses;
    if (typeof responses?.create !== 'function') return null;

    // The most reliable way to provide a PDF to the model is to upload it first,
    // then reference it by file_id in the Responses API input.
    // (Inline base64 file_data formats vary across SDK versions.)
    const filesApi = openaiAny?.files;
    if (typeof filesApi?.create !== 'function') return null;

    try {
      const instructionText = this.buildPluExtractionPrompt(
        // Do not provide the parsed text when we provide the PDF as an input file.
        // The model will read the PDF directly.
        '[PDF PROVIDED AS FILE INPUT]',
        payload.zoneCode,
        payload.zoneLabel,
        payload.documentName,
        payload.projectType,
      );

      // `File` typing in TS expects `BlobPart` backed by an `ArrayBuffer` (not `ArrayBufferLike`).
      // Convert Buffer -> Uint8Array to keep both runtime and typings happy.
      const pdfBytes = new Uint8Array(payload.pdfBuffer);
      const file = new File([pdfBytes], 'plu_reglement.pdf', {
        type: 'application/pdf',
      });
      const uploaded = await filesApi.create({
        file,
        // "assistants" is accepted by the Files API and works for Responses/Assistants usage.
        purpose: 'assistants',
      });

      // Important: call as a method on `responses` so the SDK keeps its internal `this` binding.
      const response = await responses.create({
        model: this.openaiModel,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'Tu es un assistant juridique expert en urbanisme français. Réponds uniquement en JSON valide.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                // This shape matches the Responses API "input_file" content part (when available).
                // If the upstream SDK/API expects a different key, this call will throw and we will fall back to text parsing.
                type: 'input_file',
                file_id: uploaded?.id,
              },
              { type: 'input_text', text: instructionText },
            ],
          },
        ],
        text: { format: { type: 'json_object' } },
        temperature: 0.2,
      });

      const content = this.extractTextFromOpenAiResponsesApiResult(response);
      if (!content) return null;

      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      this.logger.debug(
        `PDF-direct PLU extraction not available / failed (falling back to text parsing): ${error?.message || error}`,
      );
      return null;
    }
  }

  private extractTextFromOpenAiResponsesApiResult(response: any): string | null {
    if (!response) return null;

    // Common convenience field
    if (typeof response.output_text === 'string') return response.output_text;

    // Try to reconstruct from output blocks
    const output = response.output;
    if (!Array.isArray(output)) return null;

    const texts: string[] = [];
    for (const item of output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (typeof part?.text === 'string') texts.push(part.text);
        if (typeof part?.content === 'string') texts.push(part.content);
      }
    }

    const merged = texts.join('\n').trim();
    return merged || null;
  }

  private async upsertPluRulesCache(payload: {
    zoneCode: string;
    inseeCode: string;
    rules: Record<string, unknown>;
    sourceUrl: string | null;
    documentName: string | null;
    documentId: string | null;
    documentType: string | null;
    documentDate: string | null;
  }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const rulesWithMeta = {
      ...(payload.rules as object),
      _meta: {
        sourceUrl: payload.sourceUrl,
        documentName: payload.documentName,
        documentId: payload.documentId,
        documentType: payload.documentType,
        documentDate: payload.documentDate,
      },
    };

    await this.prisma.pluZoneCache.upsert({
      where: {
        zoneCode_inseeCode: {
          zoneCode: payload.zoneCode,
          inseeCode: payload.inseeCode,
        },
      },
      create: {
        zoneCode: payload.zoneCode,
        inseeCode: payload.inseeCode,
        rules: rulesWithMeta,
        sourceUrl: payload.sourceUrl,
        expiresAt,
      },
      update: {
        rules: rulesWithMeta,
        sourceUrl: payload.sourceUrl,
        expiresAt,
      },
    });
  }
}
