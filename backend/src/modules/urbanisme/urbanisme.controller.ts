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
  @ApiOperation({ summary: 'Get PLU zone by parcel ID or coordinates' })
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
}
