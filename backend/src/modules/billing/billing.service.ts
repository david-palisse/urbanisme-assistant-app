import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pack, PurchaseStatus } from '@prisma/client';
// import-equals: the stripe package is CJS without a .default export, a
// default import compiles to `stripe_1.default` and crashes at runtime
// (esModuleInterop is off in this project)
import Stripe = require('stripe');
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementService } from './entitlement.service';
import { CHAT_ACCESS_DAYS, PACK_DEFINITIONS } from './packs';

/**
 * Stripe Checkout integration: creates payment sessions for packs and marks
 * purchases as paid, either via webhook (production) or via explicit
 * confirmation when the user lands back on the success URL (works without
 * webhook configuration during development).
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private entitlementService: EntitlementService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
    if (!this.stripe) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not configured: checkout is disabled',
      );
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        "Le paiement n'est pas encore disponible. Veuillez réessayer plus tard.",
      );
    }
    return this.stripe;
  }

  async createCheckoutSession(
    userId: string,
    projectId: string,
    pack: Pack,
  ): Promise<{ sessionId: string; url: string }> {
    const stripe = this.getStripe();

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const definition = PACK_DEFINITIONS[pack];
    if (!definition.available) {
      throw new BadRequestException(
        `${definition.name} sera bientôt disponible.`,
      );
    }

    const entitlement =
      await this.entitlementService.getProjectEntitlement(projectId);
    if (entitlement.unlocked) {
      throw new BadRequestException(
        "L'analyse complète est déjà débloquée pour ce projet.",
      );
    }

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        projectId,
        pack,
        status: PurchaseStatus.PENDING,
        amountCents: definition.amountCents,
        currency: 'eur',
      },
    });

    const frontendUrl =
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: purchase.id,
      // Prefill the account email so the Stripe receipt goes to the right
      // address without the user retyping it
      customer_email: user?.email,
      metadata: {
        purchaseId: purchase.id,
        projectId,
        userId,
        pack,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: definition.amountCents,
            product_data: {
              name: definition.name,
              description: definition.description,
            },
          },
        },
      ],
      success_url: `${frontendUrl}/projects/${projectId}/analysis?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/projects/${projectId}/pricing?canceled=1`,
    });

    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe did not return a checkout URL',
      );
    }

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Called by the frontend when the user lands back on the success URL.
   * Verifies the session directly with Stripe, so the unlock also works when
   * no webhook is configured (local development).
   */
  async confirmCheckoutSession(userId: string, sessionId: string) {
    const stripe = this.getStripe();

    const purchase = await this.prisma.purchase.findUnique({
      where: { stripeSessionId: sessionId },
    });
    if (!purchase || purchase.userId !== userId) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status !== PurchaseStatus.PAID) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        await this.markPurchasePaid(
          purchase.id,
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        );
      }
    }

    return this.entitlementService.getProjectEntitlement(purchase.projectId);
  }

  /**
   * Purchase history for the "Mes achats" page. Receipt URLs are not part of
   * checkout.session webhook payloads, so they are fetched from Stripe here
   * on first read and cached on the purchase row.
   */
  async listUserPurchases(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        userId,
        status: { in: [PurchaseStatus.PAID, PurchaseStatus.REFUNDED] },
      },
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    });

    for (const purchase of purchases) {
      if (!purchase.receiptUrl && purchase.stripePaymentIntentId) {
        const receiptUrl = await this.fetchReceiptUrl(
          purchase.stripePaymentIntentId,
        );
        if (receiptUrl) {
          purchase.receiptUrl = receiptUrl;
          await this.prisma.purchase.update({
            where: { id: purchase.id },
            data: { receiptUrl },
          });
        }
      }
    }

    return purchases.map((purchase) => ({
      id: purchase.id,
      pack: purchase.pack,
      packName: PACK_DEFINITIONS[purchase.pack].name,
      status: purchase.status,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      paidAt: purchase.paidAt,
      receiptUrl: purchase.receiptUrl,
      project: purchase.project,
    }));
  }

  private async fetchReceiptUrl(
    paymentIntentId: string,
  ): Promise<string | null> {
    if (!this.stripe) {
      return null;
    }
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ['latest_charge'] },
      );
      const charge = paymentIntent.latest_charge;
      if (charge && typeof charge !== 'string') {
        return charge.receipt_url ?? null;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Could not fetch receipt for ${paymentIntentId}: ${error.message}`,
      );
      return null;
    }
  }

  /** Stripe webhook entry point (checkout.session.* events) */
  async handleWebhookEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    const stripe = this.getStripe();
    if (!rawBody) {
      throw new BadRequestException('Missing raw request body');
    }
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.warn(`Invalid webhook signature: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          await this.markSessionPaid(session);
        }
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.markSessionFailed(session);
        break;
      }
      case 'charge.refunded': {
        // A refund revokes the entitlement (only PAID purchases unlock)
        const charge = event.data.object as Stripe.Charge;
        await this.markRefundedByPaymentIntent(
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null,
        );
        break;
      }
      default:
        this.logger.debug(`Ignoring webhook event ${event.type}`);
    }

    return { received: true };
  }

  private async markSessionPaid(session: Stripe.Checkout.Session) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (!purchase) {
      this.logger.warn(`Webhook for unknown session ${session.id}`);
      return;
    }
    await this.markPurchasePaid(
      purchase.id,
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    );
  }

  private async markSessionFailed(session: Stripe.Checkout.Session) {
    await this.prisma.purchase.updateMany({
      where: {
        stripeSessionId: session.id,
        status: PurchaseStatus.PENDING,
      },
      data: { status: PurchaseStatus.FAILED },
    });
  }

  private async markRefundedByPaymentIntent(paymentIntentId: string | null) {
    if (!paymentIntentId) {
      return;
    }
    const updated = await this.prisma.purchase.updateMany({
      where: {
        stripePaymentIntentId: paymentIntentId,
        status: PurchaseStatus.PAID,
      },
      data: { status: PurchaseStatus.REFUNDED },
    });
    if (updated.count > 0) {
      this.logger.log(
        `Purchase refunded for payment intent ${paymentIntentId}`,
      );
    }
  }

  /** Idempotent: a purchase already PAID keeps its original dates */
  private async markPurchasePaid(
    purchaseId: string,
    paymentIntentId: string | null,
  ) {
    const paidAt = new Date();
    const chatAccessUntil = new Date(
      paidAt.getTime() + CHAT_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.purchase.updateMany({
      where: {
        id: purchaseId,
        status: { not: PurchaseStatus.PAID },
      },
      data: {
        status: PurchaseStatus.PAID,
        stripePaymentIntentId: paymentIntentId,
        paidAt,
        chatAccessUntil,
      },
    });

    if (updated.count > 0) {
      this.logger.log(`Purchase ${purchaseId} marked as paid`);
    }
  }
}
