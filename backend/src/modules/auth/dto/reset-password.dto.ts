import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongEnoughPassword } from '../../../common/password-rules';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received by email' })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (min 8 characters, not a common password)',
  })
  @IsString()
  @IsStrongEnoughPassword()
  password: string;
}
