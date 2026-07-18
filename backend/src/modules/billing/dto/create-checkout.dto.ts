import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { Pack } from '@prisma/client';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Project to unlock' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ enum: Pack, description: 'Pack to purchase' })
  @IsEnum(Pack)
  pack: Pack;

  @ApiProperty({
    example: true,
    description:
      "Acceptation des CGV et renoncement exprès au droit de rétractation (art. L221-28) — obligatoire pour l'exécution immédiate du service",
  })
  @IsBoolean()
  @Equals(true, {
    message:
      'Vous devez accepter les CGV et renoncer à votre droit de rétractation pour débloquer votre analyse.',
  })
  cgvAccepted: boolean;
}
