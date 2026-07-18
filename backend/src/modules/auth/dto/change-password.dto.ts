import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongEnoughPassword } from '../../../common/password-rules';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 characters, not a common password)',
  })
  @IsString()
  @IsStrongEnoughPassword()
  newPassword: string;
}
