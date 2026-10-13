import type { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'node:events';

const create = jest.fn();
jest.mock('@infrastructure/database/prisma', () => ({
  prisma: { auditLog: { create: (...args: unknown[]) => create(...args) } },
}));

import { auditAccess, accessDetails, byParam } from '@interfaces/http/middleware/auditAccess';

function run(options: { auth?: { sub: string }; params?: Record<string, string>; status: number; ip?: string }) {
  const req = { auth: options.auth, params: options.params ?? { id: 'student-1' }, ip: options.ip ?? '10.0.0.5' } as unknown as Request;
  const res = Object.assign(new EventEmitter(), { statusCode: options.status }) as unknown as Response;
  const next = jest.fn() as unknown as NextFunction;
  auditAccess('StudentRecord', 'READ', byParam('id'))(req, res, next);
  (res as unknown as EventEmitter).emit('finish');
  return next as unknown as jest.Mock;
}

describe('auditAccess (RNF-COMP-01)', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({});
  });

  it('no detiene la petición: pasa al siguiente middleware antes de registrar nada', () => {
    const next = run({ auth: { sub: 'u1' }, status: 200 });

    expect(next).toHaveBeenCalledWith();
  });

  it('registra quién, qué entidad, qué identificador y desde qué IP, sin contenido', () => {
    run({ auth: { sub: 'u1' }, status: 200 });

    expect(create).toHaveBeenCalledWith({
      data: { userId: 'u1', action: 'READ', entity: 'StudentRecord', entityId: 'student-1', details: 'Consulta concedida', ipAddress: '10.0.0.5' },
    });
  });

  it('registra también el intento rechazado o sin resultado', () => {
    run({ auth: { sub: 'u1' }, status: 403 });
    run({ auth: { sub: 'u1' }, status: 404 });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data.details).toBe('Consulta denegada o sin resultado (HTTP 403)');
    expect(create.mock.calls[1][0].data.details).toBe('Consulta denegada o sin resultado (HTTP 404)');
  });

  it('no registra a quien no está autenticado ni cuando falta el identificador', () => {
    run({ auth: undefined, status: 401 });
    run({ auth: { sub: 'u1' }, params: {}, status: 200 });

    expect(create).not.toHaveBeenCalled();
  });

  it('si la bitácora falla, la petición no se ve afectada: solo se informa en consola', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    create.mockRejectedValue(new Error('base caída'));

    const next = run({ auth: { sub: 'u1' }, status: 200 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('la descarga se distingue de la consulta', () => {
    expect(accessDetails('DOWNLOAD', 200)).toBe('Descarga concedida');
    expect(accessDetails('READ', 200)).toBe('Consulta concedida');
  });
});
