import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Límite de peticiones por IP en una ventana fija, en memoria (una sola instancia del servidor).
 * Para recuperar contraseña frena el uso del endpoint como disparador de correos y el sondeo de enlaces.
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? 'desconocida';
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Limpieza ocasional para que el mapa no crezca sin límite.
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      next(new AppError(429, message));
      return;
    }
    next();
  };
}
