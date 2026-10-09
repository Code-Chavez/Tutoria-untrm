import { createHash } from 'node:crypto';

/** La base solo guarda este hash; el token en claro existe únicamente en el cliente. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
