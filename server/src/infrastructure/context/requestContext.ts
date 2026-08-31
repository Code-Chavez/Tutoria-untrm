import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto por petición. Transporta el usuario autenticado y su IP a través de
 * la cadena async (middlewares → controllers → casos de uso → Prisma) sin
 * pasarlos como parámetros, para que el interceptor de auditoría pueda saber
 * quién ejecuta cada operación.
 */
export interface RequestContext {
  userId?: string;
  ipAddress?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
