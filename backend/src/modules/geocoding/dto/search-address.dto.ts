import { IsString, MinLength, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchAddressDto {
  @ApiProperty({
    example: '12 rue des Lilas, 75020 Paris',
    description: 'Address to search for',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  query: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum number of results to return',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class GetParcelDto {
  @ApiProperty({ example: 48.8566, description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude' })
  @IsNumber()
  lon: number;
}

export class UpdateAddressDto {
  @ApiProperty({
    example: '12 rue des Lilas, 75020 Paris',
    description: 'Original address input',
  })
  @IsString()
  rawInput: string;

  @ApiProperty({ example: 48.8566, description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude' })
  @IsNumber()
  lon: number;

  @ApiPropertyOptional({ example: '75120', description: 'INSEE code of the commune' })
  @IsOptional()
  @IsString()
  inseeCode?: string;

  @ApiPropertyOptional({ example: 'Paris', description: 'City name' })
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional({ example: '75020', description: 'Postal code' })
  @IsOptional()
  @IsString()
  postCode?: string;

  @ApiPropertyOptional({
    description:
      'Regulatory snapshot (FullLocationInfo) already fetched by the client, persisted as-is to avoid re-calling the external APIs',
  })
  @IsOptional()
  @IsObject()
  fullLocationInfo?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Cadastral parcel info (ParcelInfo) already fetched by the client',
  })
  @IsOptional()
  @IsObject()
  parcelInfo?: Record<string, unknown>;
}
