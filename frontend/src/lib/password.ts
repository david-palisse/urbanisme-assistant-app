// Mirror of backend/src/common/password-rules.ts — keep the two in sync.
export const PASSWORD_MIN_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'motdepasse', 'azertyuiop', 'azerty123', 'qwertyuiop', 'qwerty123',
  '11111111', '00000000', 'abcd1234', 'iloveyou', 'sunshine',
  'football', 'baseball', 'princess', 'dragon123', 'superman',
  'password123', 'admin123', 'welcome1', 'bonjour1', 'soleil123',
  'chocolat', 'doudou123', 'marseille', 'liverpool', 'starwars',
]);

export const PASSWORD_RULE_MESSAGE = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères et ne pas être un mot de passe trop courant.`;

export function isPasswordStrongEnough(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  return !COMMON_PASSWORDS.has(password.toLowerCase());
}

/** Simple 0-3 strength score for the meter under the password field */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  if (!isPasswordStrongEnough(password)) return password.length >= 4 ? 1 : 0;
  let score = 1;
  if (password.length >= 12) score++;
  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));
  if (variety >= 3) score++;
  return Math.min(score, 3);
}
