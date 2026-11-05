import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';

const findFirst = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: { academicPeriod: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

import { requireOpenPeriod } from '@interfaces/http/middleware/requireOpenPeriod';

const run = async () => {
  const next = jest.fn() as unknown as NextFunction;
  await requireOpenPeriod({} as Request, {} as Response, next);
  return next as unknown as jest.Mock;
};

describe('requireOpenPeriod (solo lectura con el periodo cerrado)', () => {
  beforeEach(() => findFirst.mockReset());

  it('deja pasar la escritura cuando hay un periodo vigente', async () => {
    findFirst.mockResolvedValue({ id: 'p1' });

    expect(await run()).toHaveBeenCalledWith();
    expect(findFirst).toHaveBeenCalledWith({ where: { isActive: true }, select: { id: true } });
  });

  it('rechaza con 409 y el código PERIOD_CLOSED cuando no hay periodo vigente', async () => {
    findFirst.mockResolvedValue(null);

    const error = (await run()).mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('PERIOD_CLOSED');
    expect(error.message).toMatch(/solo lectura/);
  });

  it('si la base falla, el error sigue su camino (no deja pasar la escritura)', async () => {
    findFirst.mockRejectedValue(new Error('base caída'));

    const error = (await run()).mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('base caída');
  });
});
