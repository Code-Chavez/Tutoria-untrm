import { type Request, type Response, type NextFunction } from 'express';
import { AccessTokenPayload, TokenService } from '@application/ports/TokenService';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { getRequestContext } from '@infrastructure/context/requestContext';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function authenticate(tokens: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      next(new AppError(401, 'Token de autenticación requerido'));
      return;
    }

    try {
      req.auth = tokens.verifyAccessToken(header.slice('Bearer '.length));
      // Completa el contexto de la petición para que la auditoría atribuya
      // las mutaciones al usuario autenticado.
      const ctx = getRequestContext();
      if (ctx) ctx.userId = req.auth.sub;
      next();
    } catch {
      next(new AppError(401, 'Token inválido o expirado'));
    }
  };
}
