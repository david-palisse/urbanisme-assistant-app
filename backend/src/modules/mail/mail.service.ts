import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface BrevoSender {
  name?: string;
  email: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends transactional email through the Brevo REST API. When BREVO_API_KEY
 * is not configured the message is logged instead of sent, so the flows
 * relying on email stay testable in development.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly sender: BrevoSender;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('brevo.apiKey');
    this.sender = this.parseSender(
      this.configService.get<string>('brevo.from') ||
        'MonUrba <noreply@mon-urba.fr>',
    );

    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY is not configured: emails will be logged');
    }
  }

  /** Splits a "Name <email>" string into Brevo's { name, email } sender shape */
  private parseSender(from: string): BrevoSender {
    const match = from.match(/^\s*(.*?)\s*<(.+)>\s*$/);
    if (match) {
      return { name: match[1] || undefined, email: match[2] };
    }
    return { email: from };
  }

  /** Returns true when the message was accepted by the Brevo API */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(
        `Email not sent (BREVO_API_KEY unconfigured) — to: ${message.to}, subject: ${message.subject}`,
      );
      this.logger.debug(message.text);
      return false;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          BREVO_API_URL,
          {
            sender: this.sender,
            to: [{ email: message.to }],
            subject: message.subject,
            textContent: message.text,
            htmlContent: message.html,
          },
          {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 10000,
          },
        ),
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Brevo send failed — to: ${message.to}, subject: ${message.subject}: ${error.message}`,
      );
      throw error;
    }
  }
}
