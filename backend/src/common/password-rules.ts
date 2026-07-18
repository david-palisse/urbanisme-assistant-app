import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;

// Most common passwords seen in breach corpora (rockyou, HIBP top lists),
// lowered-cased for comparison. Kept short on purpose: the goal is to block
// the obvious ones, not to re-implement HIBP.
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'motdepasse', 'azertyuiop', 'azerty123', 'qwertyuiop', 'qwerty123',
  '11111111', '00000000', 'abcd1234', 'iloveyou', 'sunshine',
  'football', 'baseball', 'princess', 'dragon123', 'superman',
  'password123', 'admin123', 'welcome1', 'bonjour1', 'soleil123',
  'chocolat', 'doudou123', 'marseille', 'liverpool', 'starwars',
]);

export function isPasswordStrongEnough(password: string): boolean {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  return !COMMON_PASSWORDS.has(password.toLowerCase());
}

export const PASSWORD_RULE_MESSAGE = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères et ne pas être un mot de passe trop courant.`;

/** class-validator decorator enforcing the shared password policy */
export function IsStrongEnoughPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongEnoughPassword',
      target: object.constructor,
      propertyName,
      options: { message: PASSWORD_RULE_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isPasswordStrongEnough(value);
        },
      },
    });
  };
}
