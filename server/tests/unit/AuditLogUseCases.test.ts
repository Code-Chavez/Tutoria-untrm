import {
  ListAuditLogUseCase,
  GetAuditLogOptionsUseCase,
  AuditLogForbiddenError,
  AUDIT_MAX_PAGE_SIZE,
} from '@application/use-cases/audit/AuditLogUseCases';
import { AuditLogReader } from '@domain/repositories/AuditLogReader';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';

describe('Bitácora de auditoría (UI-09)', () => {
  let roleName: string;
  let active: boolean;
  const users = { findById: jest.fn().mockImplementation(async () => ({ id: 'u', roleId: 'r', isActive: active })) } as unknown as UserRepository;
  const roles = { findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })) } as unknown as RoleRepository;
  let reader: jest.Mocked<AuditLogReader>;

  beforeEach(() => {
    roleName = 'Administrador DBU';
    active = true;
    reader = {
      query: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      distinctOptions: jest.fn().mockResolvedValue({ entities: ['User'], actions: ['LOGIN'] }),
    } as unknown as jest.Mocked<AuditLogReader>;
  });

  const list = () => new ListAuditLogUseCase(reader, users, roles);

  it('solo la DBU, y con la cuenta activa, consulta la bitácora', async () => {
    for (const name of ['Coordinador', 'Docente Tutor', 'Vicerrectorado', 'Tutorado', 'Profesional de Servicio']) {
      roleName = name;
      await expect(list().execute('u')).rejects.toBeInstanceOf(AuditLogForbiddenError);
      await expect(new GetAuditLogOptionsUseCase(reader, users, roles).execute('u')).rejects.toBeInstanceOf(AuditLogForbiddenError);
    }
    roleName = 'Administrador DBU';
    active = false;
    await expect(list().execute('u')).rejects.toBeInstanceOf(AuditLogForbiddenError);
    expect(reader.query).not.toHaveBeenCalled();
  });

  it('pagina con valores por defecto y limita el tamaño de página', async () => {
    await list().execute('u');
    expect(reader.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));
    await list().execute('u', { page: 0, pageSize: 5000 });
    expect(reader.query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: AUDIT_MAX_PAGE_SIZE }));
  });

  it('el rango de fechas incluye el día final completo y pasa los filtros', async () => {
    await list().execute('u', { from: '2026-10-01', to: '2026-10-07', actor: 'elena', entity: 'User', action: 'LOGIN' });
    const q = reader.query.mock.calls[0][0];
    expect(q.from?.toISOString()).toBe('2026-10-01T05:00:00.000Z'); // 00:00 en Lima
    expect(q.to?.toISOString()).toBe('2026-10-08T04:59:59.999Z'); // 23:59:59.999 en Lima
    expect(q).toMatchObject({ actor: 'elena', entity: 'User', action: 'LOGIN' });
  });

  it('devuelve la página junto con el total', async () => {
    reader.query.mockResolvedValue({ items: [], total: 42 });
    expect(await list().execute('u', { page: 2, pageSize: 10 })).toMatchObject({ total: 42, page: 2, pageSize: 10 });
  });
});
