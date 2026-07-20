import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a message from the public contact form' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  async sendMessage(@Body() dto: CreateContactMessageDto) {
    await this.contactService.sendContactMessage(dto);
    return { success: true };
  }
}
