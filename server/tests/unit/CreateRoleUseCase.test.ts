import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { RoleAlreadyExistsError } from '@application/use-cases/roles/RoleErrors';
import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';

// LEV-R01: crear un rol deja un registro en la bitácora con el autor, la acción y el rol creado. El rol y su registro los guarda
// el repositorio en una sola transacción (su atomicidad se prueba contra la base en tests/integration/roleCreationAudit.test.ts).
const created: Role = { id: 'role-1', name: 'Revisor', description: 'Revisa informes', permissions: [], createdAt: new Date() };

function build() {
  const roles: jest.Mocked<RoleRepository> = {
    findById: jest.fn(),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    create: jest.fn().mockResolvedValue(created),
  };
  return { roles, useCase: new CreateRoleUseCase(roles) };
}

describe('CreateRoleUseCase', () => {
  it('crea el rol pasando al repositorio el autor y la IP para la bitácora', async () => {
    const { useCase, roles } = build();

    const role = await useCase.execute({ name: '  Revisor ', description: 'Revisa informes' }, 'admin-1', '10.0.0.5');

    expect(role).toBe(created);
    expect(roles.create).toHaveBeenCalledTimes(1);
    expect(roles.create).toHaveBeenCalledWith({ name: 'Revisor', description: 'Revisa informes' }, { userId: 'admin-1', ipAddress: '10.0.0.5' });
  });

  it('sin IP pasa null', async () => {
    const { useCase, roles } = build();
    await useCase.execute({ name: 'Revisor', description: '' }, 'admin-1');
    expect(roles.create).toHaveBeenCalledWith(expect.anything(), { userId: 'admin-1', ipAddress: null });
  });

  it('un nombre repetido se rechaza sin crear nada', async () => {
    const { useCase, roles } = build();
    roles.findByName.mockResolvedValue(created);

    await expect(useCase.execute({ name: 'Revisor', description: '' }, 'admin-1')).rejects.toBeInstanceOf(RoleAlreadyExistsError);

    expect(roles.create).not.toHaveBeenCalled();
  });

  it('si el repositorio falla (creación o bitácora), el error se propaga', async () => {
    const { useCase, roles } = build();
    roles.create.mockRejectedValue(new Error('falló'));

    await expect(useCase.execute({ name: 'Revisor', description: '' }, 'admin-1')).rejects.toThrow('falló');
  });
});
