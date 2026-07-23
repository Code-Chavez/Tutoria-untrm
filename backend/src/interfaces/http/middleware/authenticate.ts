import { type Request, type Response, type NextFunction } from 'express';
import { AccessTokenPayload, TokenService } from '@application/ports/TokenService';
import { AppError } from '@infrastructure/middleware/errorHandler';

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
      next();
    } catch {
      next(new AppError(401, 'Token inválido o expirado'));
    }
  };
}
