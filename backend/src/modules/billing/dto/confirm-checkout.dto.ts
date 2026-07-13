import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmCheckoutDto {
  @ApiProperty({ description: 'Stripe Checkout session id (cs_...)' })
  @IsString()
  sessionId: string;
}
