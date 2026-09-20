import { ConfigService } from '@nestjs/config';

/**
 * PAYMENT_ACTIVATION switches the paywall. "on" (default) keeps the Stripe
 * packs; "off" makes every analysis fully accessible for free, without any
 * card or checkout, so testers are not blocked.
 *
 * Anything other than an explicit "off" keeps payments on, and a missing
 * config value counts as "on": a typo can never silently give away paid
 * content.
 */
export function parsePaymentActivation(value: string | undefined | null): boolean {
  return (value ?? 'on').trim().toLowerCase() !== 'off';
}

export function arePaymentsEnabled(configService: ConfigService): boolean {
  return configService.get<boolean>('billing.paymentsEnabled') !== false;
}
