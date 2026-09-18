import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { prisma } from '@infrastructure/database/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Códigos de permiso del usuario autenticado, cargados por authorize().
      // Permite a un controlador variar la respuesta según permisos
      // adicionales sin repetir la consulta (p. ej. el expediente oculta la
      // persona de red de apoyo si el rol no tiene support-contacts:read).
      permissions?: string[];
    }
  }
}

export function authorize(requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      next(new AppError(401, 'No autenticado'));
      return;
    }
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth.sub },
        include: { role: { include: { permissions: { include: { permission: true } } } } }
      });

      if (!user) {
        next(new AppError(401, 'Usuario no encontrado'));
        return;
      }

      const userPermissions = user.role.permissions.map(rp => rp.permission.code);
      req.permissions = userPermissions;
      const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));

      if (!hasPermission) {
        next(new AppError(403, 'No tienes permisos para realizar esta acción'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
