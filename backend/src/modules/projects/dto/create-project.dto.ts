import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ example: 'Ma piscine', description: 'Project name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: ['POOL', 'EXTENSION', 'SHED', 'FENCE', 'NEW_CONSTRUCTION'],
    example: 'POOL',
    description: 'Type of construction project',
  })
  @IsEnum(ProjectType)
  projectType: ProjectType;

  @ApiPropertyOptional({
    example: '12 rue des Lilas, 75020 Paris',
    description: 'Project address (optional at creation)',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
