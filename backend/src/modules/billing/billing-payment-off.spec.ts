import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { EntitlementService } from './entitlement.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('BillingService — PAYMENT_ACTIVATION=off', () => {
  it("refuse de créer une session Stripe et ne touche ni la base ni Stripe", async () => {
    const prisma = {
      project: { findUnique: jest.fn() },
      purchase: { create: jest.fn() },
    };
    const config = {
      get: (key: string) =>
        key === 'billing.paymentsEnabled' ? false : key === 'stripe.secretKey' ? 'sk_test_dummy' : undefined,
    } as unknown as ConfigService;
    const service = new BillingService(
      prisma as unknown as PrismaService,
      config,
      {} as EntitlementService,
      {} as MailService,
    );

    await expect(service.createCheckoutSession('u1', 'p1', 'ETUDE' as never)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.purchase.create).not.toHaveBeenCalled();
  });
});
