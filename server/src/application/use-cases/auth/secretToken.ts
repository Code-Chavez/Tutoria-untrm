import { createHash, randomBytes } from 'node:crypto';

/** Token aleatorio de un solo uso que se entrega al usuario (enlace por correo). */
export const generateSecretToken = (): string => randomBytes(32).toString('hex');

/** La base solo guarda este hash; el valor en claro existe únicamente en el correo del usuario. */
export const hashSecretToken = (token: string): string => createHash('sha256').update(token).digest('hex');
