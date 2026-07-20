import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConsentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { CGU_VERSION } from '../../common/legal-versions';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';

/** Lifetime of a password reset link */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Lifetime of an email verification link */
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    emailVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Proof of CGU acceptance (checkbox enforced by the DTO validation)
    await this.prisma.consent.create({
      data: {
        userId: user.id,
        type: ConsentType.CGU,
        version: CGU_VERSION,
      },
    });

    // Best-effort: a Brevo outage should not block account creation
    try {
      await this.sendWelcomeEmail(user.email, user.firstName);
      await this.sendVerificationEmail(user.id, user.email);
    } catch (error) {
      this.logger.error(
        `Failed to send registration emails for ${user.email}: ${error.message}`,
      );
    }

    // Generate JWT
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    };
  }

  private async sendWelcomeEmail(email: string, firstName: string | null) {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
    await this.mailService.send({
      to: email,
      subject: 'Bienvenue sur MonUrba',
      text:
        `${greeting}\n\n` +
        `Bienvenue sur MonUrba ! Votre compte est créé.\n` +
        `Vous pouvez dès maintenant décrire votre projet et lancer une analyse d'urbanisme.\n\n` +
        `L'équipe MonUrba`,
      html:
        `<p>${greeting}</p>` +
        `<p>Bienvenue sur MonUrba ! Votre compte est créé.</p>` +
        `<p>Vous pouvez dès maintenant décrire votre projet et lancer une analyse d'urbanisme.</p>` +
        `<p>L'équipe MonUrba</p>`,
    });
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
      },
    });

    const frontendUrl =
      this.configService.get<string>('frontendUrl') ||
      'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.mailService.send({
      to: email,
      subject: 'Confirmez votre adresse e-mail MonUrba',
      text:
        `Bonjour,\n\n` +
        `Merci de confirmer votre adresse e-mail en cliquant sur ce lien (valable 24 heures) :\n\n` +
        `${verifyUrl}\n\n` +
        `L'équipe MonUrba`,
      html:
        `<p>Bonjour,</p>` +
        `<p>Merci de confirmer votre adresse e-mail en cliquant sur ce lien (valable 24&nbsp;heures) :</p>` +
        `<p><a href="${verifyUrl}">Confirmer mon adresse e-mail</a></p>` +
        `<p>L'équipe MonUrba</p>`,
    });
  }

  /** Confirms the user's email from a valid, unused, unexpired verification token */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

    if (
      !verificationToken ||
      verificationToken.usedAt !== null ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Lien de confirmation invalide ou expiré.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Votre adresse e-mail a été confirmée.' };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    };
  }

  /**
   * Starts the password reset flow. Always resolves with the same message,
   * whether or not the email matches an account (no account enumeration).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // A new request invalidates previous unused links
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const frontendUrl =
        this.configService.get<string>('frontendUrl') ||
        'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
      await this.mailService.send({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe MonUrba',
        text:
          `Bonjour,\n\n` +
          `Vous avez demandé la réinitialisation du mot de passe de votre compte MonUrba.\n` +
          `Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :\n\n` +
          `${resetUrl}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.\n\n` +
          `L'équipe MonUrba`,
        html:
          `<p>Bonjour,</p>` +
          `<p>Vous avez demandé la réinitialisation du mot de passe de votre compte MonUrba.</p>` +
          `<p><a href="${resetUrl}">Choisir un nouveau mot de passe</a> (lien valable 1&nbsp;heure)</p>` +
          `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>` +
          `<p>L'équipe MonUrba</p>`,
      });
    }

    return {
      message:
        'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.',
    };
  }

  /** Sets a new password from a valid, unused, unexpired reset token */
  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message:
        'Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.',
    };
  }

  /** Updates first/last name; email is not editable for now */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    return this.getMe(userId);
  }

  /** Changes the password after verifying the current one */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Votre mot de passe a été mis à jour.' };
  }

  /**
   * GDPR account deletion (droit à l'effacement): removes the user and, by
   * cascade, projects, questionnaire answers, analyses, chat messages,
   * consents, reset tokens and local purchase rows. Payment/accounting
   * records remain available in the Stripe dashboard, which satisfies the
   * legal retention obligation without keeping personal data here.
   */
  async deleteAccount(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException(
        'Mot de passe incorrect : suppression annulée.',
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Votre compte et vos données ont été supprimés.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
