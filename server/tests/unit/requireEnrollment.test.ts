import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';

const findPeriod = jest.fn();
const findEnrollment = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: {
    academicPeriod: { findFirst: (...args: unknown[]) => findPeriod(...args) },
    periodEnrollment: { findFirst: (...args: unknown[]) => findEnrollment(...args) },
  },
}));

import { requireEnrollment } from '@interfaces/http/middleware/requireEnrollment';

const run = async () => {
  const next = jest.fn() as unknown as NextFunction;
  await requireEnrollment({ auth: { sub: 'user-1' } } as Request, {} as Response, next);
  return next as unknown as jest.Mock;
};

describe('requireEnrollment (solo quien figura en la carga del periodo actúa)', () => {
  beforeEach(() => {
    findPeriod.mockReset().mockResolvedValue({ id: 'p1' });
    findEnrollment.mockReset();
  });

  it('deja pasar a la persona matriculada en el periodo vigente', async () => {
    findEnrollment.mockResolvedValue({ id: 'e1' });

    expect(await run()).toHaveBeenCalledWith();
    expect(findEnrollment).toHaveBeenCalledWith({ where: { periodId: 'p1', student: { userId: 'user-1' } }, select: { id: true } });
  });

  it('rechaza con 403 NOT_ENROLLED a quien no figura en la carga (solo lectura)', async () => {
    findEnrollment.mockResolvedValue(null);

    const error = (await run()).mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('NOT_ENROLLED');
    expect(error.message).toMatch(/historial/);
  });

  it('sin periodo vigente no decide (lo rechaza requireOpenPeriod)', async () => {
    findPeriod.mockResolvedValue(null);

    expect(await run()).toHaveBeenCalledWith();
    expect(findEnrollment).not.toHaveBeenCalled();
  });

  it('si la base falla, el error sigue su camino (no deja pasar)', async () => {
    findEnrollment.mockRejectedValue(new Error('base caída'));

    const error = (await run()).mock.calls[0][0];

    expect((error as Error).message).toBe('base caída');
  });
});
