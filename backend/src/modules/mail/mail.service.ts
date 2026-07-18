import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Thin SMTP wrapper (provider-agnostic: Resend, Brevo, Postmark... all expose
 * SMTP). When SMTP_HOST is not configured the message is logged instead of
 * sent, so the flows relying on email stay testable in development.
 */
@Injectable()
  export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;
    private readonly from: string;

    constructor(private configService: ConfigService) {
      const host = this.configService.get<string>('smtp.host');
      const port = Number(this.configService.get('smtp.port'));
      const user = this.configService.get<string>('smtp.user');
      const pass = this.configService.get<string>('smtp.pass');
      this.from =
        this.configService.get<string>('smtp.from') ||
        'MonUrba <no-reply@mon-urba.fr>';

      if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass } : undefined,
          connectionTimeout: 10000, // 10 secondes max pour se connecter
          logger: true,
          debug: true,
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
          }
        });
      } else {
        this.transporter = null;
        this.logger.warn('SMTP_HOST is not configured: emails will be logged');
      }
    }

  /** Returns true when the message was handed to the SMTP server */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (SMTP unconfigured) — to: ${message.to}, subject: ${message.subject}`,
      );
      this.logger.debug(message.text);
      return false;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  }
}
