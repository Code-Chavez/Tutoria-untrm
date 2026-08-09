import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { prisma } from '@infrastructure/database/prisma';

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
