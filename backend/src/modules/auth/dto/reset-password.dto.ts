import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received by email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;
}
