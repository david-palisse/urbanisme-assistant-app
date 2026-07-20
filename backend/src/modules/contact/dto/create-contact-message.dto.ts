import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactMessageDto {
  @ApiProperty({ description: 'Name of the person contacting support' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Email address to reply to' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Subject of the message' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description:
      'Optional free-text context about the project the message relates to (name/address), shown to support alongside the message',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectContext?: string;
}
