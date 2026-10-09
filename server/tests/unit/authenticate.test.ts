import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import type { TokenService } from '@application/ports/TokenService';

// El middleware consulta Prisma para saber si la cuenta sigue activa (A04).
const findUnique = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { authenticate } from '@interfaces/http/middleware/authenticate';

const payload = { sub: 'user-1', email: 'x@untrm.edu.pe', role: 'Docente Tutor' };

function run(header: string | undefined, tokens: Partial<TokenService>) {
  const req = { headers: header === undefined ? {} : { authorization: header } } as Request;
  const next = jest.fn() as unknown as NextFunction;
  const promise = authenticate(tokens as TokenService)(req, {} as Response, next);
  return { req, promise, next: next as jest.Mock };
}

describe('authenticate middleware (A04)', () => {
  const validTokens = { verifyAccessToken: jest.fn().mockReturnValue(payload) };
  beforeEach(() => {
    findUnique.mockReset();
    validTokens.verifyAccessToken.mockClear();
  });

  it('con token válido y cuenta activa deja pasar y expone la identidad', async () => {
    findUnique.mockResolvedValue({ isActive: true });
    const { req, promise, next } = run('Bearer abc', validTokens);
    await promise;

    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toEqual(payload);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { isActive: true } });
  });

  it('rechaza con 401 una cuenta desactivada aunque el token siga firmado y vigente', async () => {
    findUnique.mockResolvedValue({ isActive: false });
    const { req, promise, next } = run('Bearer abc', validTokens);
    await promise;

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toMatch(/desactivada/);
    expect(req.auth).toBeUndefined();
  });

  it('rechaza con 401 una cuenta que ya no existe', async () => {
    findUnique.mockResolvedValue(null);
    const { promise, next } = run('Bearer abc', validTokens);
    await promise;
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rechaza sin consultar la base si falta el token o es inválido', async () => {
    const missing = run(undefined, validTokens);
    await missing.promise;
    expect(missing.next.mock.calls[0][0].statusCode).toBe(401);

    const bad = run('Bearer mal', { verifyAccessToken: jest.fn(() => { throw new Error('firma'); }) });
    await bad.promise;
    expect(bad.next.mock.calls[0][0].message).toMatch(/inválido o expirado/);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('si la base falla propaga el error en lugar de dejar pasar', async () => {
    findUnique.mockRejectedValue(new Error('db caída'));
    const { req, promise, next } = run('Bearer abc', validTokens);
    await promise;

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(req.auth).toBeUndefined();
  });
});
