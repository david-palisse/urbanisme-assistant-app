import { isPasswordStrongEnough } from './password-rules';

describe('isPasswordStrongEnough', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(isPasswordStrongEnough('abc123')).toBe(false);
    expect(isPasswordStrongEnough('1234567')).toBe(false);
  });

  it('rejects common passwords regardless of case', () => {
    expect(isPasswordStrongEnough('12345678')).toBe(false);
    expect(isPasswordStrongEnough('password')).toBe(false);
    expect(isPasswordStrongEnough('PassWord1')).toBe(false);
    expect(isPasswordStrongEnough('Motdepasse')).toBe(false);
    expect(isPasswordStrongEnough('AZERTYUIOP')).toBe(false);
  });

  it('accepts reasonable 8+ character passwords', () => {
    expect(isPasswordStrongEnough('D4RKL0RD')).toBe(true);
    expect(isPasswordStrongEnough('mon-abri-2026')).toBe(true);
    expect(isPasswordStrongEnough('correct horse battery')).toBe(true);
  });
});
