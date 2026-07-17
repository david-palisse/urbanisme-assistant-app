import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export const PROJECT_SORTS = ['recent', 'oldest', 'name'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export class ListProjectsDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12, description: 'Items per page (max 50)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search in project name or commune' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PROJECT_SORTS, description: 'Sort order' })
  @IsOptional()
  @IsIn(PROJECT_SORTS as unknown as string[])
  sort?: ProjectSort;
}
