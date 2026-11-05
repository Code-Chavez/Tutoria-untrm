import { Request, Response } from 'express';
import { UserController } from '@interfaces/http/controllers/UserController';
import { LastActiveAdministratorError } from '@application/use-cases/users/UserErrors';

// C-3: proteger a la última cuenta de administración activa se informa como conflicto (409) con el mensaje claro del servidor, en
// las tres operaciones que pueden desactivar o cambiar de rol a una cuenta. La regla en sí se prueba contra la base en
// tests/integration/lastAdministrator.test.ts.
const mockRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('UserController: última cuenta de administración activa', () => {
  const updateUc = { execute: jest.fn() };
  const toggleUc = { execute: jest.fn() };
  const assignUc = { execute: jest.fn() };
  const controller = new UserController({} as never, updateUc as never, toggleUc as never, {} as never, assignUc as never, {} as never, { allowedDomains: [] } as never);
  const error = new LastActiveAdministratorError();

  it.each([
    ['desactivar', () => toggleUc.execute.mockRejectedValue(error), (res: Response) => controller.toggleStatus({ params: { id: 'u1' } } as unknown as Request, res)],
    ['cambiar el rol', () => assignUc.execute.mockRejectedValue(error), (res: Response) => controller.assignRole({ params: { id: 'u1' }, body: { roleId: '3f2b8f0e-5c1d-4a57-9d51-0a5d7c5b1e11' } } as unknown as Request, res)],
    ['actualizar', () => updateUc.execute.mockRejectedValue(error), (res: Response) => controller.update({ params: { id: 'u1' }, body: { firstName: 'Ana' } } as unknown as Request, res)],
  ])('%s: responde 409 con el mensaje del servidor', async (_name, arrange, act) => {
    arrange();
    const res = mockRes();

    await act(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: error.message });
    expect(error.message).toMatch(/última cuenta de administración activa/);
  });
});
