import { ConfigService } from '@nestjs/config';
import { arePaymentsEnabled, parsePaymentActivation } from './payment-activation';

describe('parsePaymentActivation', () => {
  it('reste activé par défaut', () => {
    expect(parsePaymentActivation(undefined)).toBe(true);
    expect(parsePaymentActivation('')).toBe(true);
    expect(parsePaymentActivation('on')).toBe(true);
  });

  it('se désactive uniquement avec "off", sans tenir compte de la casse ni des espaces', () => {
    expect(parsePaymentActivation('off')).toBe(false);
    expect(parsePaymentActivation(' OFF ')).toBe(false);
  });

  it("ne désactive jamais sur une faute de frappe : un paywall ne saute pas par accident", () => {
    for (const value of ['of', 'false', '0', 'disabled', 'no']) {
      expect(parsePaymentActivation(value)).toBe(true);
    }
  });
});

describe('arePaymentsEnabled', () => {
  const config = (value: unknown) =>
    ({ get: () => value }) as unknown as ConfigService;

  it('lit billing.paymentsEnabled et traite une valeur absente comme activé', () => {
    expect(arePaymentsEnabled(config(false))).toBe(false);
    expect(arePaymentsEnabled(config(true))).toBe(true);
    expect(arePaymentsEnabled(config(undefined))).toBe(true);
  });
});
