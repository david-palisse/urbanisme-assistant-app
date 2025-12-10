import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
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
import { GeocodingService } from './geocoding.service';
import { SearchAddressDto, GetParcelDto, UpdateAddressDto } from './dto/search-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search for an address using BAN API' })
  @ApiResponse({ status: 200, description: 'Address search results' })
  @ApiResponse({ status: 400, description: 'Invalid search query' })
  async searchAddress(@Body() dto: SearchAddressDto) {
    return this.geocodingService.searchAddress(dto.query, dto.limit);
  }

  @Get('parcel')
  @ApiOperation({ summary: 'Get parcel information from coordinates' })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', type: Number, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'Parcel information' })
  async getParcel(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    return this.geocodingService.getParcelFromCoordinates(lat, lon);
  }

  @Post('projects/:id/address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address for a project' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProjectAddress(
    @Request() req: RequestWithUser,
    @Param('id') projectId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.geocodingService.updateProjectAddress(projectId, dto);
  }
}
