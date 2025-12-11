import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UrbanismeService } from './urbanisme.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('urbanisme')
@Controller('urbanisme')
export class UrbanismeController {
  constructor(private readonly urbanismeService: UrbanismeService) {}

  @Get('zone')
  @ApiOperation({ summary: 'Get PLU zone by parcel ID or coordinates (returns first/main zone only)' })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Cadastral parcel ID' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: false, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'PLU zone information' })
  async getZone(
    @Query('parcelId') parcelId?: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    if (parcelId) {
      return this.urbanismeService.getPluZone(parcelId, lat, lon);
    } else if (lat && lon) {
      return this.urbanismeService.getPluZoneByCoordinates(lat, lon);
    } else {
      return { error: 'Either parcelId or lat/lon coordinates are required' };
    }
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get ALL PLU zones and prescriptions at coordinates (returns array of all overlapping zones)' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'Array of all PLU zones and prescriptions at this location' })
  async getAllZones(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    if (!lat || !lon) {
      return { error: 'Both lat and lon coordinates are required' };
    }
    return this.urbanismeService.getAllPluZonesByCoordinates(lat, lon);
  }

  @Get('flood-zone')
  @ApiOperation({ summary: 'Get flood zone (PPRI) information by coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'Flood zone information' })
  async getFloodZone(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    return this.urbanismeService.getFloodZoneInfo(lat, lon);
  }

  @Get('abf-protection')
  @ApiOperation({ summary: 'Check ABF (Monument Historique) protection by coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'ABF protection information' })
  async getAbfProtection(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    return this.urbanismeService.getAbfProtectionInfo(lat, lon);
  }

  @Get('natural-risks')
  @ApiOperation({ summary: 'Get natural risks (seismic, clay) by coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'Natural risks information' })
  async getNaturalRisks(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    return this.urbanismeService.getNaturalRisksInfo(lat, lon);
  }

  @Get('full-info')
  @ApiOperation({ summary: 'Get all regulatory information for a location' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'Full location regulatory information' })
  async getFullLocationInfo(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    return this.urbanismeService.getFullLocationInfo(lat, lon);
  }

  @Post('projects/:id/plu-zone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update PLU zone for a project' })
  @ApiResponse({ status: 200, description: 'PLU zone updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProjectPluZone(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.urbanismeService.updateProjectPluZone(projectId);
  }

  @Post('projects/:id/full-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update all regulatory info for a project (PLU, flood zone, ABF, etc.)' })
  @ApiResponse({ status: 200, description: 'All regulatory info updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProjectFullInfo(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
  ) {
    return this.urbanismeService.updateProjectFullLocationInfo(projectId);
  }
}
