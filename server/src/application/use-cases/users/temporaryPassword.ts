import { randomInt } from 'node:crypto';

// Sin caracteres que se confunden al leerlos o dictarlos (0/O, 1/l/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const LENGTH = 12;

/** Clave temporal aleatoria (criptográfica) y distinta para cada cuenta nueva. */
export function generateTemporaryPassword(): string {
  let password = '';
  for (let i = 0; i < LENGTH; i += 1) password += ALPHABET[randomInt(ALPHABET.length)];
  return password;
}
