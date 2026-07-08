import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../../prisma/prisma.service';
import { PluZoneService } from './plu-zone.service';
import { StageTimer } from '../../../common/metrics/stage-timer';
const pdfParse = require('pdf-parse');

/**
 * Bumped whenever the extraction prompt/output schema changes, so stale
 * cache entries produced by an older schema are ignored and re-extracted.
 */
export const PLU_RULES_SCHEMA_VERSION = 2;

/**
 * Extraction of written PLU regulations: downloads the règlement PDF from
 * Geoportail Urbanisme and extracts structured rules with an LLM, with a
 * Prisma-backed cache.
 *
 * The extraction is project-type-agnostic: the full ruleset of the zone is
 * extracted once (general rules + all project-type exceptions) and cached per
 * (zoneCode, inseeCode), so a single entry serves every project and project
 * type. Project-type reasoning happens later, in the analysis prompt.
 */
@Injectable()
export class PluRulesService {
  private readonly logger = new Logger(PluRulesService.name);
  private readonly GPU_DOCUMENT_URL = 'https://apicarto.ign.fr/api/gpu/document';

  private openai: OpenAI | null = null;
  private extractionModel: string = 'gpt-4o';

  /**
   * Single-flight guard: the address-time prefetch and a concurrent analysis
   * must not both pay the PDF download + extraction LLM call for the same
   * (inseeCode, zoneCode).
   */
  private readonly inflightExtractions = new Map<
    string,
    Promise<Record<string, unknown> | null>
  >();

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private pluZoneService: PluZoneService,
  ) {
    const apiKey =
      this.configService.get<string>('openai.apiKey') ||
      process.env.OPENAI_API_KEY;
    this.extractionModel =
      this.configService.get<string>('openai.extractionModel') ||
      process.env.OPENAI_EXTRACTION_MODEL ||
      this.configService.get<string>('openai.model') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o';

    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async getPluRuleset(
    inseeCode: string | null,
    zoneCode: string | null,
    documentName: string | null,
    lat?: number,
    lon?: number,
    metrics?: StageTimer,
  ): Promise<Record<string, unknown> | null> {
    if (!inseeCode || !zoneCode) return null;

    const cached = await this.readPluRulesCache(zoneCode, inseeCode);
    metrics?.set('pluRulesCacheHit', !!cached);
    if (cached) return cached;

    if (!lat || !lon) return null;

    const flightKey = `${inseeCode}:${zoneCode}`;
    const inflight = this.inflightExtractions.get(flightKey);
    if (inflight) {
      metrics?.set('pluRulesExtractionCoalesced', true);
      return inflight;
    }

    const extraction = this.resolveAndExtractRuleset(
      inseeCode,
      zoneCode,
      documentName,
      lat,
      lon,
      metrics,
    ).finally(() => this.inflightExtractions.delete(flightKey));

    this.inflightExtractions.set(flightKey, extraction);
    return extraction;
  }

  private async resolveAndExtractRuleset(
    inseeCode: string,
    zoneCode: string,
    documentName: string | null,
    lat: number,
    lon: number,
    metrics?: StageTimer,
  ): Promise<Record<string, unknown> | null> {
    const zones = await (metrics
      ? metrics.time('resolveZone', () =>
          this.pluZoneService.getAllPluZonesByCoordinates(lat, lon),
        )
      : this.pluZoneService.getAllPluZonesByCoordinates(lat, lon));
    const zone = zones.find((z) => z.zoneCode === zoneCode) || zones[0];

    if (!zone) return null;

    // Use Geoportail Urbanisme details API to get a stable, downloadable PDF for the written regulation.
    const gpuDocumentId =
      zone.documentId || (await this.getPrimaryDocumentIdByCoordinates(lat, lon));
    this.logger.debug(`PLU document id for ${inseeCode}/${zoneCode}: ${gpuDocumentId || 'null'}`);
    const details = gpuDocumentId
      ? await (metrics
          ? metrics.time('gpuDetails', () => this.getGeoportailDocumentDetails(gpuDocumentId))
          : this.getGeoportailDocumentDetails(gpuDocumentId))
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
      gpuDocumentId,
      metrics,
    );

    const meta = {
      sourceUrl: reglementUrl,
      documentName: documentName || zone.documentName || null,
      documentId: gpuDocumentId || null,
      documentType: (details && (details.type || details.documentType)) || null,
      documentDate:
        (details && (details.approbationDate || details.publicationDate || details.statusDate)) ||
        null,
    };

    // Only cache successful extractions: an empty entry would either poison
    // the cache or (with the non-empty hit condition) be dead weight.
    if (rules && Object.keys(rules).length > 0) {
      await this.upsertPluRulesCache({
        zoneCode: zone.zoneCode,
        // Prefer the INSEE code from BAN (address) because GPU sometimes returns null/empty
        inseeCode,
        rules,
        ...meta,
      });
      return { ...rules, _meta: meta };
    }

    return rules;
  }

  /**
   * Read a fresh, schema-compatible cache entry for the zone. Returns the
   * rules with the `_meta` block reconstructed from the metadata columns, so
   * warm and cold paths have the same shape.
   */
  private async readPluRulesCache(
    zoneCode: string,
    inseeCode: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const cached = await this.prisma.pluRulesCache.findUnique({
        where: { zoneCode_inseeCode: { zoneCode, inseeCode } },
      });

      if (!cached) return null;
      if (cached.expiresAt <= new Date()) return null;
      if (cached.schemaVersion !== PLU_RULES_SCHEMA_VERSION) return null;

      const rules = cached.rules as Record<string, unknown> | null;
      if (!rules || Object.keys(rules).length === 0) return null;

      return {
        ...rules,
        _meta: {
          sourceUrl: cached.sourceUrl,
          documentName: cached.documentName,
          documentId: cached.documentId,
          documentType: cached.documentType,
          documentDate: cached.documentDate,
        },
      };
    } catch (error) {
      this.logger.warn(`PLU rules cache read failed for ${inseeCode}/${zoneCode}: ${error.message}`);
      return null;
    }
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
    documentId: string | null,
    metrics?: StageTimer,
  ): Promise<Record<string, unknown> | null> {
    if (!this.openai) return null;

    try {
      // A PLUi PDF serves many zones: reuse the OpenAI file uploaded for a
      // previous zone of the same document instead of re-downloading and
      // re-uploading it.
      if (documentId) {
        const cachedFileId = await this.getCachedOpenaiFileId(documentId);
        if (cachedFileId) {
          const fromCachedFile = await this.tryExtractPluRulesWithFileId({
            fileId: cachedFileId,
            zoneCode,
            zoneLabel,
            documentName,
            metrics,
          });
          if (fromCachedFile) {
            metrics?.set('openaiFileReused', true);
            return fromCachedFile;
          }
          // The stored file id no longer works (deleted/expired upstream).
          await this.deleteCachedOpenaiFileId(documentId);
        }
      }

      if (!sourceUrl) return null;

      const pdfBuffer = await (metrics
        ? metrics.time('pdfFetch', () => this.fetchPdfBuffer(sourceUrl))
        : this.fetchPdfBuffer(sourceUrl));
      if (!pdfBuffer) return null;

      // Preferred path (when supported by the SDK / API): pass the PDF as a file input to the model.
      // This preserves layout cues (tables, headings, article structure) that are often lost in plain text extraction.
      const uploadedFileId = await this.tryUploadPdf(pdfBuffer, metrics);
      if (uploadedFileId) {
        if (documentId) {
          await this.saveCachedOpenaiFileId(documentId, uploadedFileId, sourceUrl);
        }
        const fromPdfInput = await this.tryExtractPluRulesWithFileId({
          fileId: uploadedFileId,
          zoneCode,
          zoneLabel,
          documentName,
          metrics,
        });
        if (fromPdfInput) return fromPdfInput;
      }

      const parsed = await pdfParse(pdfBuffer);
      const text = parsed.text || '';

      if (!text) return null;

      const prompt = this.buildPluExtractionPrompt(
        this.truncateTextForPrompt(text),
        zoneCode,
        zoneLabel,
        documentName,
      );

      const doTextCall = () =>
        this.openai!.chat.completions.create({
          model: this.extractionModel,
          messages: [
            { role: 'system', content: 'Tu es un assistant juridique expert en urbanisme français. Réponds uniquement en JSON valide.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

      const response = await (metrics
        ? metrics.time('extractionLlm', doTextCall)
        : doTextCall());

      metrics?.addLlmUsage('extraction', response.usage);

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
  ): string {
    return `Tu dois extraire l'INTÉGRALITÉ des règles d'urbanisme applicables à une zone, à partir d'un règlement de PLU/PLUi (document PDF converti en texte). Cette extraction sera réutilisée pour analyser des projets de types variés (piscine, extension, abri de jardin, clôture, construction neuve...) : elle ne doit privilégier aucun type de projet.

Contexte:
- Document: ${documentName || 'PLU'}
- Zone: ${zoneCode} (${zoneLabel})

OBJECTIF (très important):
1) Extraire les règles générales de la zone (implantation, emprise, hauteur, stationnement, aspect, espaces verts, etc.)
2) Extraire TOUTES les exceptions et variantes liées à un type de projet ou de construction particulier (piscine, extension, annexe, abri de jardin, clôture, construction neuve, etc.) dans le tableau "exceptions", sans en omettre ni en privilégier aucune.
3) Pour chaque règle et chaque exception, indiquer si possible sa source (numéro d'article, section ou page du règlement).

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
  "exceptions": [
    {
      "appliesTo": "type de projet ou de construction concerné (ex: piscine, extension, annexe, cloture)",
      "category": "catégorie de règle (ex: setbacks, height, footprint)",
      "rule": "la règle dérogatoire, avec ses valeurs",
      "source": "article/section du règlement ou null"
    }
  ],
  "inheritedFrom": "",
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

  /**
   * Upload the PDF to the OpenAI Files API when the SDK supports it. Returns
   * the file id, or null when the capability is missing or the upload fails
   * (the caller then falls back to text parsing).
   */
  private async tryUploadPdf(pdfBuffer: Buffer, metrics?: StageTimer): Promise<string | null> {
    if (!this.openai) return null;

    const openaiAny = this.openai as any;
    const filesApi = openaiAny?.files;
    if (typeof filesApi?.create !== 'function') return null;

    try {
      // `File` typing in TS expects `BlobPart` backed by an `ArrayBuffer` (not `ArrayBufferLike`).
      // Convert Buffer -> Uint8Array to keep both runtime and typings happy.
      const pdfBytes = new Uint8Array(pdfBuffer);
      const file = new File([pdfBytes], 'plu_reglement.pdf', {
        type: 'application/pdf',
      });
      const uploaded = await (metrics
        ? metrics.time('openaiFileUpload', () =>
            filesApi.create({
              file,
              // "assistants" is accepted by the Files API and works for Responses/Assistants usage.
              purpose: 'assistants',
            }),
          )
        : filesApi.create({ file, purpose: 'assistants' }));
      return uploaded?.id || null;
    } catch (error) {
      this.logger.debug(`OpenAI PDF upload failed (falling back to text parsing): ${error?.message || error}`);
      return null;
    }
  }

  private async tryExtractPluRulesWithFileId(payload: {
    fileId: string;
    zoneCode: string;
    zoneLabel: string;
    documentName: string | null;
    metrics?: StageTimer;
  }): Promise<Record<string, unknown> | null> {
    if (!this.openai) return null;

    // openai@4.24.x may not expose the Responses API typings; use a runtime capability check.
    const openaiAny = this.openai as any;
    const responses = openaiAny?.responses;
    if (typeof responses?.create !== 'function') return null;

    try {
      const instructionText = this.buildPluExtractionPrompt(
        // Do not provide the parsed text when we provide the PDF as an input file.
        // The model will read the PDF directly.
        '[PDF PROVIDED AS FILE INPUT]',
        payload.zoneCode,
        payload.zoneLabel,
        payload.documentName,
      );

      const doCall = () =>
        // Important: call as a method on `responses` so the SDK keeps its internal `this` binding.
        responses.create({
          model: this.extractionModel,
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
                  file_id: payload.fileId,
                },
                { type: 'input_text', text: instructionText },
              ],
            },
          ],
          text: { format: { type: 'json_object' } },
          temperature: 0.2,
        });

      const response = await (payload.metrics
        ? payload.metrics.time('extractionLlm', doCall)
        : doCall());

      payload.metrics?.addLlmUsage('extraction', response?.usage);

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

  private async getCachedOpenaiFileId(documentId: string): Promise<string | null> {
    try {
      const record = await this.prisma.pluDocumentFile.findUnique({
        where: { documentId },
      });
      return record?.openaiFileId || null;
    } catch (error) {
      this.logger.warn(`PLU document file cache read failed: ${error.message}`);
      return null;
    }
  }

  private async saveCachedOpenaiFileId(
    documentId: string,
    openaiFileId: string,
    sourceUrl: string | null,
  ): Promise<void> {
    try {
      await this.prisma.pluDocumentFile.upsert({
        where: { documentId },
        create: { documentId, openaiFileId, sourceUrl },
        update: { openaiFileId, sourceUrl, fetchedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`PLU document file cache write failed: ${error.message}`);
    }
  }

  private async deleteCachedOpenaiFileId(documentId: string): Promise<void> {
    try {
      await this.prisma.pluDocumentFile.delete({ where: { documentId } });
    } catch {
      // Already gone: fine.
    }
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

    const data = {
      rules: payload.rules as object,
      sourceUrl: payload.sourceUrl,
      documentId: payload.documentId,
      documentName: payload.documentName,
      documentType: payload.documentType,
      documentDate: payload.documentDate,
      extractionModel: this.extractionModel,
      schemaVersion: PLU_RULES_SCHEMA_VERSION,
      extractedAt: new Date(),
      expiresAt,
    };

    try {
      await this.prisma.pluRulesCache.upsert({
        where: {
          zoneCode_inseeCode: {
            zoneCode: payload.zoneCode,
            inseeCode: payload.inseeCode,
          },
        },
        create: {
          zoneCode: payload.zoneCode,
          inseeCode: payload.inseeCode,
          ...data,
        },
        update: data,
      });
    } catch (error) {
      // Caching is best-effort: never fail the extraction because of it.
      this.logger.warn(`PLU rules cache write failed for ${payload.inseeCode}/${payload.zoneCode}: ${error.message}`);
    }
  }
}
