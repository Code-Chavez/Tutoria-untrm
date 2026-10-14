import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';

// El middleware consulta Prisma directamente; lo mockeamos para probar la
// lógica de permisos sin base de datos.
const findUnique = jest.fn();
const findPermissions = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUnique(...args) },
    rolePermission: { findMany: (...args: unknown[]) => findPermissions(...args) },
  },
}));

// Import after the mock is registered.
import { authorize } from '@interfaces/http/middleware/authorize';
import { clearRolePermissionCache } from '@infrastructure/security/rolePermissions';

const rows = (codes: string[]) => codes.map((code) => ({ permission: { code } }));

function runMiddleware(permissions: string[], auth: Request['auth'], accountRoleId?: string) {
  const req = { auth, accountRoleId } as Request;
  const res = {} as Response;
  const next = jest.fn() as unknown as NextFunction;
  return { req, promise: authorize(permissions)(req, res, next), next: next as jest.Mock };
}

describe('authorize middleware (requirePermission)', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findPermissions.mockReset();
    clearRolePermissionCache();
  });

  const auth = { sub: 'user-1', email: 'x@untrm.edu.pe', role: 'Docente Tutor' };

  it('responde 403 si el rol no tiene el permiso requerido', async () => {
    findPermissions.mockResolvedValue(rows(['students:read']));

    const { promise, next } = runMiddleware(['admin:system'], auth, 'role-1');
    await promise;

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });

  it('deja pasar (next sin error) si el rol tiene el permiso y lo expone en la petición', async () => {
    findPermissions.mockResolvedValue(rows(['admin:system', 'users:read']));

    const { req, promise, next } = runMiddleware(['admin:system'], auth, 'role-1');
    await promise;

    expect(next).toHaveBeenCalledWith();
    expect(req.permissions).toEqual(['admin:system', 'users:read']);
  });

  it('responde 401 si no hay usuario autenticado', async () => {
    const { promise, next } = runMiddleware(['admin:system'], undefined);
    await promise;

    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('reutiliza el rol que leyó authenticate: no vuelve a consultar la cuenta', async () => {
    findPermissions.mockResolvedValue(rows(['admin:system']));

    await runMiddleware(['admin:system'], auth, 'role-1').promise;

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('los permisos de un rol se consultan una vez y se recuerdan para las peticiones siguientes', async () => {
    findPermissions.mockResolvedValue(rows(['admin:system']));

    await runMiddleware(['admin:system'], auth, 'role-1').promise;
    await runMiddleware(['admin:system'], auth, 'role-1').promise;
    await runMiddleware(['admin:system'], auth, 'role-2').promise;

    expect(findPermissions).toHaveBeenCalledTimes(2); // role-1 una vez, role-2 una vez
  });

  describe('sin authenticate previo (defensa en profundidad)', () => {
    it('responde 401 si la cuenta fue desactivada, aunque su rol tenga el permiso y el token siga vigente (A04)', async () => {
      findUnique.mockResolvedValue({ roleId: 'role-1', isActive: false });
      findPermissions.mockResolvedValue(rows(['admin:system']));

      const { promise, next } = runMiddleware(['admin:system'], auth);
      await promise;

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/desactivada/);
    });

    it('responde 401 si la cuenta ya no existe', async () => {
      findUnique.mockResolvedValue(null);

      const { promise, next } = runMiddleware(['admin:system'], auth);
      await promise;

      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('lee el rol vigente de la cuenta y comprueba sus permisos', async () => {
      findUnique.mockResolvedValue({ roleId: 'role-9', isActive: true });
      findPermissions.mockResolvedValue(rows(['admin:system']));

      const { promise, next } = runMiddleware(['admin:system'], auth);
      await promise;

      expect(findPermissions).toHaveBeenCalledWith(expect.objectContaining({ where: { roleId: 'role-9' } }));
      expect(next).toHaveBeenCalledWith();
    });
  });
});
