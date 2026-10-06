import { type Request, type Response, type NextFunction } from 'express';
import { AccessTokenPayload, TokenService } from '@application/ports/TokenService';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { getRequestContext } from '@infrastructure/context/requestContext';
import { prisma } from '@infrastructure/database/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

/**
 * Valida el token y que la cuenta siga activa. El JWT firmado no basta: una
 * cuenta dada de baja (o eliminada) pierde el acceso de inmediato, sin esperar a
 * que venza su access token.
 */
export function authenticate(tokens: TokenService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      next(new AppError(401, 'Token de autenticación requerido'));
      return;
    }

    let payload: AccessTokenPayload;
    try {
      payload = tokens.verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      next(new AppError(401, 'Token inválido o expirado'));
      return;
    }

    try {
      const account = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
      if (!account || !account.isActive) {
        next(new AppError(401, 'La cuenta está desactivada o ya no existe'));
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    req.auth = payload;
    // Completa el contexto de la petición para que la auditoría atribuya
    // las mutaciones al usuario autenticado.
    const ctx = getRequestContext();
    if (ctx) ctx.userId = payload.sub;
    next();
  };
}
