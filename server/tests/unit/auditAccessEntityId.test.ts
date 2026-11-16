import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { auditAccess, byParam } from '../../src/interfaces/http/middleware/auditAccess';

const create = jest.fn().mockResolvedValue({});
jest.mock('@infrastructure/database/prisma', () => ({ prisma: { auditLog: { create: (...args: unknown[]) => create(...args) } } }));

/**
 * El identificador de lo consultado se lee al empezar, no al terminar la respuesta: si el intento se rechaza (p. ej. 403 de `authorize`),
 * Express ya pasó al manejador de errores y `req.params` quedó vacío. Antes, ese intento rechazado se perdía de la bitácora.
 */
function exchange(params: Record<string, string>) {
  const req = { params, auth: { sub: 'user-1' }, ip: '10.0.0.1' } as unknown as Request;
  const res = Object.assign(new EventEmitter(), { statusCode: 403 }) as unknown as Response;
  return { req, res };
}

describe('auditAccess: identificador de la entidad', () => {
  beforeEach(() => create.mockClear());

  it('registra el intento rechazado aunque `req.params` se vacíe antes de que termine la respuesta', async () => {
    const { req, res } = exchange({ id: 'cert-9' });
    const next = jest.fn() as unknown as NextFunction;
    auditAccess('Certificate', 'DOWNLOAD', byParam('id'))(req, res, next);
    expect(next).toHaveBeenCalled();

    // Lo que pasa con un 403: el manejador de errores responde con otros parámetros de ruta.
    (req as { params: Record<string, string> }).params = {};
    res.emit('finish');
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0].data).toMatchObject({ userId: 'user-1', action: 'DOWNLOAD', entity: 'Certificate', entityId: 'cert-9', details: 'Descarga denegada o sin resultado (HTTP 403)', ipAddress: '10.0.0.1' });
  });

  it('una descarga concedida queda con su resultado', async () => {
    const { req, res } = exchange({ id: 'cert-9' });
    (res as { statusCode: number }).statusCode = 200;
    auditAccess('Certificate', 'DOWNLOAD', byParam('id'))(req, res, jest.fn() as unknown as NextFunction);
    res.emit('finish');
    await new Promise((resolve) => setImmediate(resolve));
    expect(create.mock.calls[0]![0].data.details).toBe('Descarga concedida');
  });

  it('sin sesión o sin identificador no se registra nada', async () => {
    const anonymous = exchange({ id: 'cert-9' });
    (anonymous.req as { auth?: unknown }).auth = undefined;
    auditAccess('Certificate', 'DOWNLOAD', byParam('id'))(anonymous.req, anonymous.res, jest.fn() as unknown as NextFunction);
    anonymous.res.emit('finish');

    const withoutId = exchange({});
    auditAccess('Certificate', 'DOWNLOAD', byParam('id'))(withoutId.req, withoutId.res, jest.fn() as unknown as NextFunction);
    withoutId.res.emit('finish');

    await new Promise((resolve) => setImmediate(resolve));
    expect(create).not.toHaveBeenCalled();
  });
});
