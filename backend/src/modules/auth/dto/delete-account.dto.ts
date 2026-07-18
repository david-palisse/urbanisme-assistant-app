import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Current password, required to confirm deletion' })
  @IsString()
  password: string;
}
