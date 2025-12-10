import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Ma piscine modifiée', description: 'Project name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: ['POOL', 'EXTENSION', 'SHED', 'FENCE'],
    example: 'POOL',
    description: 'Type of construction project',
  })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'QUESTIONNAIRE', 'ANALYZING', 'COMPLETED'],
    example: 'QUESTIONNAIRE',
    description: 'Current project status',
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
