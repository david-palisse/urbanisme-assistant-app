import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { Pack } from '@prisma/client';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Project to unlock' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ enum: Pack, description: 'Pack to purchase' })
  @IsEnum(Pack)
  pack: Pack;
}
