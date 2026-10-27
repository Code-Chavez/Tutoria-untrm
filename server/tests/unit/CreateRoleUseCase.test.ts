import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { RoleAlreadyExistsError } from '@application/use-cases/roles/RoleErrors';
import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

// LEV-R01: crear un rol deja un registro en la bitácora con el autor, la acción y el rol creado; lo que no se crea no se registra.
const created: Role = { id: 'role-1', name: 'Revisor', description: 'Revisa informes', permissions: [], createdAt: new Date() };

function build() {
  const roles: jest.Mocked<RoleRepository> = {
    findById: jest.fn(),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    create: jest.fn().mockResolvedValue(created),
  };
  const audit: jest.Mocked<AuditLogRepository> = { create: jest.fn(), findAll: jest.fn() };
  return { roles, audit, useCase: new CreateRoleUseCase(roles, audit) };
}

describe('CreateRoleUseCase', () => {
  it('registra autor, acción, rol creado e IP al crear el rol', async () => {
    const { useCase, audit } = build();

    const role = await useCase.execute({ name: '  Revisor ', description: 'Revisa informes' }, 'admin-1', '10.0.0.5');

    expect(role).toBe(created);
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: 'role-1',
      details: 'Rol «Revisor»',
      ipAddress: '10.0.0.5',
    });
  });

  it('sin IP guarda null', async () => {
    const { useCase, audit } = build();
    await useCase.execute({ name: 'Revisor', description: '' }, 'admin-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: null }));
  });

  it('un nombre repetido se rechaza y no registra nada', async () => {
    const { useCase, roles, audit } = build();
    roles.findByName.mockResolvedValue(created);

    await expect(useCase.execute({ name: 'Revisor', description: '' }, 'admin-1')).rejects.toBeInstanceOf(RoleAlreadyExistsError);

    expect(roles.create).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('si la creación falla (p. ej. otro alta simultánea con el mismo nombre) no registra nada', async () => {
    const { useCase, roles, audit } = build();
    roles.create.mockRejectedValue(new Error('Unique constraint failed'));

    await expect(useCase.execute({ name: 'Revisor', description: '' }, 'admin-1')).rejects.toThrow('Unique constraint');

    expect(audit.create).not.toHaveBeenCalled();
  });
});
