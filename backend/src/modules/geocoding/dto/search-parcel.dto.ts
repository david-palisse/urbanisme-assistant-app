import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchParcelDto {
  @ApiProperty({
    description: 'Code INSEE de la commune (5 chiffres)',
    example: '75101',
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  codeInsee: string;

  @ApiProperty({
    description: 'Section cadastrale (2 caractères)',
    example: 'AB',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Matches(/^[A-Z0-9]{2}$/)
  section: string;

  @ApiProperty({
    description: 'Numéro de parcelle (4 chiffres)',
    example: '0001',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  numero: string;
}
