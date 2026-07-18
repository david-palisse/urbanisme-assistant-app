import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongEnoughPassword } from '../../../common/password-rules';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'mon-mot-de-passe',
    description: 'User password (min 8 characters, not a common password)',
  })
  @IsString()
  @IsStrongEnoughPassword()
  password: string;

  @ApiPropertyOptional({ example: 'John', description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: true,
    description:
      'Acceptation des CGU et de la politique de confidentialité (obligatoire)',
  })
  @IsBoolean()
  @Equals(true, {
    message: 'Vous devez accepter les CGU pour créer un compte.',
  })
  acceptCgu: boolean;
}
