import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { CreateContactMessageDto } from './dto';

// Same support address surfaced everywhere else on the site (footer,
// mentions légales, CGU/CGV, FAQ).
const SUPPORT_EMAIL = 'contact@mon-urba.fr';

@Injectable()
export class ContactService {
  constructor(private mailService: MailService) {}

  async sendContactMessage(dto: CreateContactMessageDto): Promise<void> {
    const projectLine = dto.projectContext
      ? `Projet concerné : ${dto.projectContext}\n\n`
      : '';

    await this.mailService.send({
      to: SUPPORT_EMAIL,
      replyTo: dto.email,
      subject: `[Contact] ${dto.subject}`,
      text:
        `Nouveau message via le formulaire de contact.\n\n` +
        `De : ${dto.name} <${dto.email}>\n\n` +
        projectLine +
        `${dto.message}`,
      html:
        `<p>Nouveau message via le formulaire de contact.</p>` +
        `<p>De : ${dto.name} &lt;${dto.email}&gt;</p>` +
        (dto.projectContext
          ? `<p>Projet concerné : ${dto.projectContext}</p>`
          : '') +
        `<p>${dto.message.replace(/\n/g, '<br>')}</p>`,
    });
  }
}
