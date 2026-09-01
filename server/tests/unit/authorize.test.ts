import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';

// El middleware consulta Prisma directamente; lo mockeamos para probar la
// lógica de permisos sin base de datos.
const findUnique = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

// Import after the mock is registered.
import { authorize } from '@interfaces/http/middleware/authorize';

function userWithPermissions(codes: string[]) {
  return {
    id: 'user-1',
    role: { permissions: codes.map((code) => ({ permission: { code } })) },
  };
}

function runMiddleware(permissions: string[], auth: Request['auth']) {
  const req = { auth } as Request;
  const res = {} as Response;
  const next = jest.fn() as unknown as NextFunction;
  return { promise: authorize(permissions)(req, res, next), next: next as jest.Mock };
}

describe('authorize middleware (requirePermission)', () => {
  beforeEach(() => findUnique.mockReset());

  const auth = { sub: 'user-1', email: 'x@untrm.edu.pe', role: 'Docente Tutor' };

  it('responde 403 si el rol no tiene el permiso requerido', async () => {
    findUnique.mockResolvedValue(userWithPermissions(['students:read']));

    const { promise, next } = runMiddleware(['admin:system'], auth);
    await promise;

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });

  it('deja pasar (next sin error) si el rol tiene el permiso', async () => {
    findUnique.mockResolvedValue(userWithPermissions(['admin:system', 'users:read']));

    const { promise, next } = runMiddleware(['admin:system'], auth);
    await promise;

    expect(next).toHaveBeenCalledWith();
  });

  it('responde 401 si no hay usuario autenticado', async () => {
    const { promise, next } = runMiddleware(['admin:system'], undefined);
    await promise;

    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });
});
