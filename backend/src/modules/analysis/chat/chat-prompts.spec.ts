import { serializePluRules } from './chat-prompts';

describe('serializePluRules', () => {
  const rules = {
    rules: { setbacks: { value: '3 m', quote: 'q'.repeat(200) } },
    landUse: { entries: [{ appliesTo: 'réhabilitation', status: 'autorisé', quote: 'q'.repeat(200) }] },
  };

  it('garde le ruleset complet, citations comprises, sous le budget', () => {
    const out = serializePluRules(rules, 10000);
    expect(out).toContain('"quote"');
    expect(out).toContain('réhabilitation');
  });

  it('retire les citations avant de tronquer quand le budget est dépassé', () => {
    const out = serializePluRules(rules, 200);
    expect(out).not.toContain('"quote"');
    expect(out).toContain('réhabilitation');
    expect(out).not.toContain('tronqué');
  });

  it('ne tronque qu\'en dernier recours', () => {
    const out = serializePluRules(rules, 40);
    expect(out).toContain('(tronqué)');
  });
});
