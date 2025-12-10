import { IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveQuestionnaireDto {
  @ApiProperty({
    description: 'Object containing all questionnaire responses',
    example: {
      piscine_type: 'enterree',
      piscine_surface: 32,
      piscine_abri: 'aucun',
      distance_limite_separative: 3,
    },
  })
  @IsObject()
  responses: Record<string, string | number | boolean | string[]>;

  @ApiPropertyOptional({
    description: 'Mark questionnaire as completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
