import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChatMessageDto {
  @ApiProperty({
    description: 'User question about the analyzed project',
    example: 'Pourquoi mon projet nécessite-t-il un permis de construire ?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
