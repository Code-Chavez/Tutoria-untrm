import { type Request, type Response } from 'express';
import { AppError, errorHandler } from '../../src/infrastructure/middleware/errorHandler';

const run = (err: Error) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  errorHandler(err, {} as Request, res, jest.fn());
  return res;
};

describe('errorHandler', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('un JSON mal formado es un error del cliente (400), no del servidor', () => {
    const res = run(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }));
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('un cuerpo demasiado grande responde 413', () => {
    const res = run(Object.assign(new Error('too large'), { type: 'entity.too.large' }));
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('un error de la aplicación conserva su código', () => {
    expect(run(new AppError(404, 'no existe')).status).toHaveBeenCalledWith(404);
  });

  it('un error inesperado responde 500 sin exponer su detalle', () => {
    const res = run(new Error('conexión a postgres://usuario:clave@host'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify((res.json as jest.Mock).mock.calls[0])).not.toContain('postgres');
  });
});
