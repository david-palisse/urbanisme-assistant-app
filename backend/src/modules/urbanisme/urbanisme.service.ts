import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PluZoneInfo,
  FloodZoneInfo,
  AbfProtectionInfo,
  NaturalRisksInfo,
  NoiseExposureInfo,
  FullLocationInfo,
} from './urbanisme.types';
import { PluZoneService } from './services/plu-zone.service';
import { GeorisquesService } from './services/georisques.service';
import { AbfService } from './services/abf.service';
import { NoiseExposureService } from './services/noise-exposure.service';
import { PluRulesService } from './services/plu-rules.service';
import { ParcelGeometryService } from './services/parcel-geometry.service';

// Re-export types so existing consumers importing from urbanisme.service keep working
export * from './urbanisme.types';

/**
 * Facade orchestrating the specialized urbanisme services (PLU zones,
 * Géorisques, ABF, noise exposure, PLU rules extraction) and persisting
 * regulatory info on project addresses.
 */
@Injectable()
export class UrbanismeService {
  private readonly logger = new Logger(UrbanismeService.name);

  constructor(
    private prisma: PrismaService,
    private pluZoneService: PluZoneService,
    private georisquesService: GeorisquesService,
    private abfService: AbfService,
    private noiseExposureService: NoiseExposureService,
    private pluRulesService: PluRulesService,
    private parcelGeometryService: ParcelGeometryService,
  ) {}

  async getPluZone(parcelId: string, lat?: number, lon?: number): Promise<PluZoneInfo | null> {
    return this.pluZoneService.getPluZone(parcelId, lat, lon);
  }

  async getPluZoneByCoordinates(lat: number, lon: number): Promise<PluZoneInfo | null> {
    return this.pluZoneService.getPluZoneByCoordinates(lat, lon);
  }

  async getAllPluZonesByCoordinates(lat: number, lon: number): Promise<PluZoneInfo[]> {
    return this.pluZoneService.getAllPluZonesByCoordinates(lat, lon);
  }

  async getPluDocumentDownloadUrl(documentId: string): Promise<string | null> {
    return this.pluRulesService.getPluDocumentDownloadUrl(documentId);
  }

  async getFloodZoneInfo(lat: number, lon: number): Promise<FloodZoneInfo> {
    return this.georisquesService.getFloodZoneInfo(lat, lon);
  }

  async getNaturalRisksInfo(lat: number, lon: number): Promise<NaturalRisksInfo> {
    return this.georisquesService.getNaturalRisksInfo(lat, lon);
  }

  async getAbfProtectionInfo(lat: number, lon: number): Promise<AbfProtectionInfo> {
    return this.abfService.getAbfProtectionInfo(lat, lon);
  }

  async getNoiseExposureInfo(lat: number, lon: number): Promise<NoiseExposureInfo> {
    return this.noiseExposureService.getNoiseExposureInfo(lat, lon);
  }

  async getPluRuleset(
    inseeCode: string | null,
    zoneCode: string | null,
    documentName: string | null,
    projectType?: string | null,
    lat?: number,
    lon?: number,
  ): Promise<Record<string, unknown> | null> {
    return this.pluRulesService.getPluRuleset(
      inseeCode,
      zoneCode,
      documentName,
      projectType,
      lat,
      lon,
    );
  }

  /**
   * Get all location information (PLU zone, flood zone, ABF, natural risks, noise exposure).
   * When available, the cadastral parcel geometry is used instead of the bare
   * address point, so constraints covering only part of the parcel are found.
   */
  async getFullLocationInfo(
    lat: number,
    lon: number,
    parcelId?: string | null,
  ): Promise<FullLocationInfo> {
    const parcelGeometry = await this.parcelGeometryService.getParcelGeometry(
      lat,
      lon,
      parcelId,
    );
    const floodSamplePoints = parcelGeometry
      ? this.parcelGeometryService.getSamplePoints(parcelGeometry)
      : undefined;

    const [pluZones, floodZone, abfProtection, naturalRisks, noiseExposure, otherGeorisques] =
      await Promise.all([
        this.pluZoneService.getAllPluZonesByCoordinates(lat, lon, parcelGeometry),
        this.georisquesService.getFloodZoneInfo(lat, lon, floodSamplePoints),
        this.abfService.getAbfProtectionInfo(lat, lon, parcelGeometry),
        this.georisquesService.getNaturalRisksInfo(lat, lon),
        this.noiseExposureService.getNoiseExposureInfo(lat, lon),
        this.georisquesService.getOtherGeorisques(lat, lon),
      ]);

    // Keep backward compatibility: pluZone is the first/main zone
    const pluZone = pluZones.length > 0 ? pluZones[0] : null;

    return {
      pluZone,
      pluZones,
      floodZone,
      abfProtection,
      naturalRisks,
      noiseExposure,
      otherGeorisques,
    };
  }

  async updateProjectPluZone(projectId: string): Promise<PluZoneInfo | null> {
    // Get project address
    const address = await this.prisma.address.findUnique({
      where: { projectId },
    });

    if (!address) {
      throw new BadRequestException('Project has no address');
    }

    // Get PLU zone
    const zoneInfo = await this.pluZoneService.getPluZoneByCoordinates(address.lat, address.lon);

    if (zoneInfo) {
      // Update address with PLU zone
      await this.prisma.address.update({
        where: { projectId },
        data: {
          pluZone: zoneInfo.zoneCode,
          pluZoneLabel: zoneInfo.zoneLabel,
        },
      });
    }

    return zoneInfo;
  }

  /**
   * Update project with all location regulatory information
   */
  async updateProjectFullLocationInfo(projectId: string): Promise<FullLocationInfo> {
    const address = await this.prisma.address.findUnique({
      where: { projectId },
    });

    if (!address) {
      throw new BadRequestException('Project has no address');
    }

    // Get all location info (using the stored parcel when available)
    const fullInfo = await this.getFullLocationInfo(
      address.lat,
      address.lon,
      address.parcelId,
    );

    // Update address with all information including noise exposure (PEB)
    await this.prisma.address.update({
      where: { projectId },
      data: {
        pluZone: fullInfo.pluZone?.zoneCode || null,
        pluZoneLabel: fullInfo.pluZone?.zoneLabel || null,
        floodZone: fullInfo.floodZone.zoneType,
        floodZoneLevel: fullInfo.floodZone.riskLevel,
        floodZoneSource: fullInfo.floodZone.sourceName,
        isAbfProtected: fullInfo.abfProtection.isProtected,
        abfType: fullInfo.abfProtection.protectionType,
        abfPerimeter: fullInfo.abfProtection.perimeterDescription,
        abfMonumentName: fullInfo.abfProtection.monumentName,
        seismicZone: fullInfo.naturalRisks.seismicZone,
        clayRisk: fullInfo.naturalRisks.clayRisk,
        // Noise exposure (PEB) data
        isInNoiseZone: fullInfo.noiseExposure.isInNoiseZone,
        noiseZone: fullInfo.noiseExposure.zone,
        noiseAirportName: fullInfo.noiseExposure.airportName,
        noiseAirportCode: fullInfo.noiseExposure.airportCode,
        noiseRestrictions: fullInfo.noiseExposure.restrictions,
      },
    });

    // Best-effort prefetch of written PLU regulation (Geoportail Urbanisme) and rule extraction.
    // This warms up the cache right after an address is set, so the later LLM analysis
    // can rely on real extracted rules.
    if (address.inseeCode && fullInfo.pluZone?.zoneCode) {
      void this.pluRulesService
        .getPluRuleset(
          address.inseeCode,
          fullInfo.pluZone.zoneCode,
          fullInfo.pluZone.documentName || null,
          null,
          address.lat,
          address.lon,
        )
        .catch((error) => {
          this.logger.warn(
            `PLU rules prefetch failed for project ${projectId}: ${error.message}`,
          );
        });
    }

    return fullInfo;
  }
}
