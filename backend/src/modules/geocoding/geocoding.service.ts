import { Injectable, Logger, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UrbanismeService } from '../urbanisme/urbanisme.service';

export interface GeocodingResult {
  label: string;
  score: number;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  citycode: string; // INSEE code
  lat: number;
  lon: number;
}

export interface ParcelInfo {
  parcelId: string;
  section: string;
  numero: string;
  commune: string;
  codeCommune: string;
  codeDepartement: string;
  surface?: number;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly BAN_API_URL = 'https://api-adresse.data.gouv.fr/search/';
  private readonly CADASTRE_API_URL = 'https://apicarto.ign.fr/api/cadastre/parcelle';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => UrbanismeService))
    private urbanismeService: UrbanismeService,
  ) {}

  async searchAddress(query: string, limit = 5): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Search query must be at least 3 characters');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.BAN_API_URL, {
          params: {
            q: query,
            limit,
          },
        }),
      );

      const features = response.data.features || [];

      return features.map((feature: any) => ({
        label: feature.properties.label,
        score: feature.properties.score,
        housenumber: feature.properties.housenumber,
        street: feature.properties.street,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        citycode: feature.properties.citycode,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
      }));
    } catch (error) {
      this.logger.error(`BAN API error: ${error.message}`);
      throw new BadRequestException('Failed to geocode address');
    }
  }

  async getParcelFromCoordinates(lat: number, lon: number): Promise<ParcelInfo | null> {
    try {
      // Create a GeoJSON point for the API
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lon, lat],
      });

      const response = await firstValueFrom(
        this.httpService.get(this.CADASTRE_API_URL, {
          params: {
            geom,
          },
        }),
      );

      const features = response.data.features || [];

      if (features.length === 0) {
        return null;
      }

      const parcel = features[0].properties;

      return {
        parcelId: `${parcel.code_dep}${parcel.code_com}${parcel.section}${parcel.numero}`,
        section: parcel.section,
        numero: parcel.numero,
        commune: parcel.nom_com,
        codeCommune: parcel.code_com,
        codeDepartement: parcel.code_dep,
        surface: parcel.contenance,
      };
    } catch (error) {
      this.logger.error(`Cadastre API error: ${error.message}`);
      // Return null instead of throwing - parcel info is optional
      return null;
    }
  }

  async updateProjectAddress(
    projectId: string,
    addressData: {
      rawInput: string;
      lat: number;
      lon: number;
      inseeCode?: string;
      cityName?: string;
      postCode?: string;
    },
  ) {
    // Try to get parcel info
    const parcelInfo = await this.getParcelFromCoordinates(
      addressData.lat,
      addressData.lon,
    );

    // Check if address already exists
    const existingAddress = await this.prisma.address.findUnique({
      where: { projectId },
    });

    const addressPayload = {
      rawInput: addressData.rawInput,
      lat: addressData.lat,
      lon: addressData.lon,
      inseeCode: addressData.inseeCode || null,
      cityName: addressData.cityName || null,
      postCode: addressData.postCode || null,
      parcelId: parcelInfo?.parcelId || null,
    };

    let address;
    if (existingAddress) {
      address = await this.prisma.address.update({
        where: { projectId },
        data: addressPayload,
      });
    } else {
      address = await this.prisma.address.create({
        data: {
          projectId,
          ...addressPayload,
        },
      });
    }

    // Asynchronously fetch and update full location regulatory info (PLU, flood zones, ABF, etc.)
    // We don't await this to avoid blocking the address save operation
    this.updateProjectRegulatoryInfo(projectId).catch((error) => {
      this.logger.error(`Error updating regulatory info for project ${projectId}: ${error.message}`);
    });

    return address;
  }

  private async updateProjectRegulatoryInfo(projectId: string): Promise<void> {
    try {
      await this.urbanismeService.updateProjectFullLocationInfo(projectId);
      this.logger.log(`Successfully updated regulatory info for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to update regulatory info for project ${projectId}: ${error.message}`);
      throw error;
    }
  }
}
