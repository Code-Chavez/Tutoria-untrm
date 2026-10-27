import { Request, Response } from 'express';
import { DataRequestController } from '@interfaces/http/controllers/DataRequestController';
import { DataRequestInFlightError, DuplicateDataRequestError, OperationIdConflictError } from '@application/use-cases/data-requests/DataRequestUseCases';
import { DataRequest } from '@domain/repositories/DataRequestRepository';

// LEV-R04: cómo responde la API al crear un pedido. Las reglas se prueban en DataRequestIdempotency.test.ts y contra la base.
const mockRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
const OP = '11111111-1111-4111-8111-111111111111';
const SCHOOL = '22222222-2222-4222-8222-222222222222';
const row = (status: DataRequest['status']) => ({ id: 'r1', status }) as DataRequest;
const previous = { id: 'r0', createdAt: new Date('2026-10-28T12:00:00Z'), status: 'ENVIADO' as const };

describe('DataRequestController.create', () => {
  const send = { execute: jest.fn() };
  const controller = new DataRequestController(send as never, {} as never, {} as never, {} as never);
  const call = async (body: Record<string, unknown> = { schoolId: SCHOOL, operationId: OP }) => {
    const res = mockRes();
    await controller.create({ auth: { sub: 'u1' }, body, ip: '10.0.0.1' } as unknown as Request, res as unknown as Response);
    return res;
  };

  it.each([
    ['creado y enviado', { request: row('ENVIADO'), replayed: false }, 201],
    ['repetición de una operación ya guardada', { request: row('ENVIADO'), replayed: true }, 200],
    ['registrado pero el correo no fue aceptado', { request: row('FALLIDO'), replayed: false }, 502],
    ['registrado con resultado incierto', { request: row('INCIERTO'), replayed: false }, 202],
  ])('%s -> %i', async (_name, result, status) => {
    send.execute.mockResolvedValueOnce(result);

    const res = await call();

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ request: result.request, replayed: result.replayed }));
  });

  it('pasa el identificador de operación y el pedido a confirmar al caso de uso', async () => {
    send.execute.mockResolvedValueOnce({ request: row('ENVIADO'), replayed: false });

    await call({ schoolId: SCHOOL, cycles: [1], operationId: OP, confirmDuplicateOf: '33333333-3333-4333-8333-333333333333' });

    expect(send.execute).toHaveBeenLastCalledWith('u1', expect.objectContaining({ operationId: OP, confirmDuplicateOf: '33333333-3333-4333-8333-333333333333' }), '10.0.0.1');
  });

  it('un equivalente reciente responde 409 con el pedido anterior identificado y un código que el cliente reconoce', async () => {
    send.execute.mockRejectedValueOnce(new DuplicateDataRequestError(previous));

    const res = await call();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/pedido equivalente/), code: 'DUPLICATE_DATA_REQUEST', previous });
  });

  it('un envío equivalente en curso responde 409 con otro código (no admite confirmación)', async () => {
    send.execute.mockRejectedValueOnce(new DataRequestInFlightError({ ...previous, status: 'PENDIENTE' }));

    const res = await call();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DATA_REQUEST_IN_FLIGHT' }));
  });

  it('un identificador reutilizado con otros datos responde 422 sin datos de ningún pedido', async () => {
    send.execute.mockRejectedValueOnce(new OperationIdConflictError());

    const res = await call();

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String), code: 'OPERATION_ID_CONFLICT' });
  });

  it.each([
    ['identificador que no es UUID', { schoolId: SCHOOL, operationId: 'no-es-uuid' }],
    ['pedido a confirmar que no es UUID', { schoolId: SCHOOL, confirmDuplicateOf: 'x' }],
  ])('%s -> 400 sin llamar al caso de uso', async (_name, body) => {
    send.execute.mockClear();

    const res = await call(body);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send.execute).not.toHaveBeenCalled();
  });
});
