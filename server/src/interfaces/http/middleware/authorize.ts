import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { prisma } from '@infrastructure/database/prisma';
import { permissionCodesForRole } from '@infrastructure/security/rolePermissions';

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
      // authenticate ya leyó la cuenta (activa, con su rol vigente): se reutiliza para no repetir la consulta.
      let roleId = req.accountRoleId;
      if (!roleId) {
        const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { roleId: true, isActive: true } });
        if (!user) {
          next(new AppError(401, 'Usuario no encontrado'));
          return;
        }
        // Defensa en profundidad: una cuenta dada de baja no ejerce permisos aunque su token siga vigente.
        if (user.isActive === false) {
          next(new AppError(401, 'La cuenta está desactivada'));
          return;
        }
        roleId = user.roleId;
      }

      const userPermissions = await permissionCodesForRole(roleId);
      req.permissions = userPermissions;
      const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));

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
