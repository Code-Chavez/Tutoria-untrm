import { type Request, type Response, type NextFunction } from 'express';
import { requestContext } from '../context/requestContext';

/**
 * Abre un contexto de AsyncLocalStorage para cada petición. El userId se
 * completa más adelante en `authenticate`, cuando se valida el token; aquí solo
 * sembramos la IP y dejamos el store listo para que toda la cadena lo comparta.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  requestContext.run({ userId: undefined, ipAddress: req.ip }, () => next());
}
