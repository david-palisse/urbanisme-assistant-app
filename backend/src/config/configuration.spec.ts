import configuration from './configuration';

// Garde-fou : PAYMENT_ACTIVATION n'a d'effet que si la variable d'environnement
// est bien branchée sur la config. Ce lien a déjà été perdu lors d'un merge de
// conflit, ce qui rendait `PAYMENT_ACTIVATION=off` silencieusement sans effet.
describe('configuration — PAYMENT_ACTIVATION', () => {
  const previous = process.env.PAYMENT_ACTIVATION;
  afterEach(() => {
    if (previous === undefined) delete process.env.PAYMENT_ACTIVATION;
    else process.env.PAYMENT_ACTIVATION = previous;
  });

  it('expose billing.paymentsEnabled = false quand PAYMENT_ACTIVATION=off', () => {
    process.env.PAYMENT_ACTIVATION = 'off';
    expect(configuration().billing.paymentsEnabled).toBe(false);
  });

  it('garde les paiements activés par défaut et sur une valeur inconnue', () => {
    delete process.env.PAYMENT_ACTIVATION;
    expect(configuration().billing.paymentsEnabled).toBe(true);
    process.env.PAYMENT_ACTIVATION = 'of';
    expect(configuration().billing.paymentsEnabled).toBe(true);
  });
});
