import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import Stripe = require('stripe');
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BillingService } from './billing.service';
import { EntitlementService } from './entitlement.service';

const WEBHOOK_SECRET = 'whsec_test_secret';

/** Builds a signed webhook payload the way Stripe would send it */
function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type,
    data: { object },
  });
  const signature = new Stripe('sk_test_dummy').webhooks.generateTestHeaderString(
    {
      payload,
      secret: WEBHOOK_SECRET,
    },
  );
  return { rawBody: Buffer.from(payload), signature };
}

describe('BillingService webhook handling', () => {
  let service: BillingService;
  let prisma: {
    purchase: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let mailService: { send: jest.Mock };

  const createService = async (config: Record<string, string | undefined>) => {
    prisma = {
      purchase: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mailService = { send: jest.fn().mockResolvedValue(true) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        {
          provide: EntitlementService,
          useValue: { getProjectEntitlement: jest.fn() },
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  };

  beforeEach(() =>
    createService({
      'stripe.secretKey': 'sk_test_dummy',
      'stripe.webhookSecret': WEBHOOK_SECRET,
    }),
  );

  it('rejects a payload with an invalid signature', async () => {
    const { rawBody } = signedEvent('checkout.session.completed', {});

    await expect(
      service.handleWebhookEvent(rawBody, 't=1,v1=bad_signature'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a request without raw body or signature', async () => {
    const { rawBody, signature } = signedEvent(
      'checkout.session.completed',
      {},
    );

    await expect(
      service.handleWebhookEvent(undefined, signature),
    ).rejects.toThrow(BadRequestException);
    await expect(service.handleWebhookEvent(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('fails loudly when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    await createService({ 'stripe.secretKey': 'sk_test_dummy' });
    const { rawBody, signature } = signedEvent(
      'checkout.session.completed',
      {},
    );

    await expect(
      service.handleWebhookEvent(rawBody, signature),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('marks the purchase as paid with a 30-day chat window on checkout.session.completed', async () => {
    prisma.purchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      status: PurchaseStatus.PENDING,
      pack: 'ETUDE',
      project: { id: 'project-1', name: 'Abri de jardin - Le Bignon' },
      user: { email: 'buyer@example.com' },
    });
    const { rawBody, signature } = signedEvent('checkout.session.completed', {
      id: 'cs_test_1',
      object: 'checkout.session',
      payment_status: 'paid',
      payment_intent: 'pi_test_1',
    });

    const response = await service.handleWebhookEvent(rawBody, signature);

    expect(response).toEqual({ received: true });
    expect(prisma.purchase.updateMany).toHaveBeenCalledTimes(1);
    const args = prisma.purchase.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 'purchase-1',
      status: { not: PurchaseStatus.PAID },
    });
    expect(args.data.status).toBe(PurchaseStatus.PAID);
    expect(args.data.stripePaymentIntentId).toBe('pi_test_1');
    const windowMs =
      args.data.chatAccessUntil.getTime() - args.data.paidAt.getTime();
    expect(windowMs).toBe(30 * 24 * 60 * 60 * 1000);

    expect(mailService.send).toHaveBeenCalledTimes(1);
    expect(mailService.send.mock.calls[0][0]).toMatchObject({
      to: 'buyer@example.com',
    });
  });

  it('does not fail the webhook when the confirmation email fails to send', async () => {
    prisma.purchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      status: PurchaseStatus.PENDING,
      pack: 'ETUDE',
      project: { id: 'project-1', name: 'Abri de jardin - Le Bignon' },
      user: { email: 'buyer@example.com' },
    });
    mailService.send.mockRejectedValue(new Error('brevo down'));
    const { rawBody, signature } = signedEvent('checkout.session.completed', {
      id: 'cs_test_1',
      object: 'checkout.session',
      payment_status: 'paid',
      payment_intent: 'pi_test_1',
    });

    const response = await service.handleWebhookEvent(rawBody, signature);

    expect(response).toEqual({ received: true });
    expect(prisma.purchase.updateMany).toHaveBeenCalledTimes(1);
  });

  it('ignores a paid session that matches no purchase', async () => {
    prisma.purchase.findUnique.mockResolvedValue(null);
    const { rawBody, signature } = signedEvent('checkout.session.completed', {
      id: 'cs_unknown',
      object: 'checkout.session',
      payment_status: 'paid',
    });

    const response = await service.handleWebhookEvent(rawBody, signature);

    expect(response).toEqual({ received: true });
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  it('does not unlock an unpaid completed session', async () => {
    const { rawBody, signature } = signedEvent('checkout.session.completed', {
      id: 'cs_test_1',
      object: 'checkout.session',
      payment_status: 'unpaid',
    });

    await service.handleWebhookEvent(rawBody, signature);

    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  it('marks a pending purchase as failed when the session expires', async () => {
    const { rawBody, signature } = signedEvent('checkout.session.expired', {
      id: 'cs_test_1',
      object: 'checkout.session',
      payment_status: 'unpaid',
    });

    await service.handleWebhookEvent(rawBody, signature);

    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { stripeSessionId: 'cs_test_1', status: PurchaseStatus.PENDING },
      data: { status: PurchaseStatus.FAILED },
    });
  });

  it('revokes the entitlement on charge.refunded', async () => {
    const { rawBody, signature } = signedEvent('charge.refunded', {
      id: 'ch_test_1',
      object: 'charge',
      payment_intent: 'pi_test_1',
    });

    await service.handleWebhookEvent(rawBody, signature);

    expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
      where: {
        stripePaymentIntentId: 'pi_test_1',
        status: PurchaseStatus.PAID,
      },
      data: { status: PurchaseStatus.REFUNDED },
    });
  });

  describe('listUserPurchases', () => {
    const basePurchase = {
      id: 'purchase-1',
      pack: 'ETUDE',
      status: PurchaseStatus.PAID,
      amountCents: 3900,
      currency: 'eur',
      paidAt: new Date('2026-07-17T00:00:00Z'),
      stripePaymentIntentId: 'pi_test_1',
      project: { id: 'project-1', name: 'Abri de jardin - Le Bignon' },
    };

    it('maps purchases without calling Stripe when the receipt is cached', async () => {
      prisma.purchase.findMany.mockResolvedValue([
        { ...basePurchase, receiptUrl: 'https://stripe.test/receipt' },
      ]);

      const result = await service.listUserPurchases('user-1');

      expect(result).toEqual([
        {
          id: 'purchase-1',
          pack: 'ETUDE',
          packName: 'Pack Étude',
          status: PurchaseStatus.PAID,
          amountCents: 3900,
          currency: 'eur',
          paidAt: basePurchase.paidAt,
          receiptUrl: 'https://stripe.test/receipt',
          project: basePurchase.project,
        },
      ]);
      expect(prisma.purchase.update).not.toHaveBeenCalled();
    });

    it('backfills and caches the receipt URL from Stripe on first read', async () => {
      prisma.purchase.findMany.mockResolvedValue([
        { ...basePurchase, receiptUrl: null },
      ]);
      const retrieve = jest.fn().mockResolvedValue({
        latest_charge: { receipt_url: 'https://stripe.test/receipt-new' },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).stripe.paymentIntents = { retrieve };

      const result = await service.listUserPurchases('user-1');

      expect(retrieve).toHaveBeenCalledWith('pi_test_1', {
        expand: ['latest_charge'],
      });
      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: 'purchase-1' },
        data: { receiptUrl: 'https://stripe.test/receipt-new' },
      });
      expect(result[0].receiptUrl).toBe('https://stripe.test/receipt-new');
    });

    it('tolerates a Stripe failure and returns the purchase without receipt', async () => {
      prisma.purchase.findMany.mockResolvedValue([
        { ...basePurchase, receiptUrl: null },
      ]);
      const retrieve = jest.fn().mockRejectedValue(new Error('stripe down'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).stripe.paymentIntents = { retrieve };

      const result = await service.listUserPurchases('user-1');

      expect(result[0].receiptUrl).toBeNull();
      expect(prisma.purchase.update).not.toHaveBeenCalled();
    });
  });

  it('acknowledges unhandled event types without touching purchases', async () => {
    const { rawBody, signature } = signedEvent('payment_intent.created', {
      id: 'pi_test_1',
      object: 'payment_intent',
    });

    const response = await service.handleWebhookEvent(rawBody, signature);

    expect(response).toEqual({ received: true });
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });
});
