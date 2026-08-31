import { buildAuditEntry } from '@infrastructure/database/auditEntry';

describe('buildAuditEntry', () => {
  const base = { userId: 'admin-1', ipAddress: '10.0.0.5' };

  it('audita la creación de un modelo crítico', () => {
    const entry = buildAuditEntry({
      model: 'User',
      operation: 'create',
      args: { data: { email: 'x@untrm.edu.pe' } },
      result: { id: 'user-9' },
      ...base,
    });

    expect(entry).toEqual({
      userId: 'admin-1',
      action: 'CREATE',
      entity: 'User',
      entityId: 'user-9',
      details: null,
      ipAddress: '10.0.0.5',
    });
  });

  it('registra los campos modificados en un update', () => {
    const entry = buildAuditEntry({
      model: 'User',
      operation: 'update',
      args: { where: { id: 'user-9' }, data: { roleId: 'role-2', phone: '999' } },
      result: { id: 'user-9' },
      ...base,
    });

    expect(entry?.action).toBe('UPDATE');
    expect(entry?.entityId).toBe('user-9');
    expect(entry?.details).toBe('roleId, phone');
  });

  it('toma el id del where cuando el resultado no lo trae (delete)', () => {
    const entry = buildAuditEntry({
      model: 'User',
      operation: 'delete',
      args: { where: { id: 'user-9' } },
      result: null,
      ...base,
    });

    expect(entry?.action).toBe('DELETE');
    expect(entry?.entityId).toBe('user-9');
  });

  it('no audita modelos no críticos', () => {
    const entry = buildAuditEntry({
      model: 'RefreshToken',
      operation: 'create',
      args: { data: {} },
      result: { id: 'rt-1' },
      ...base,
    });
    expect(entry).toBeNull();
  });

  it('no audita operaciones no mutantes', () => {
    const entry = buildAuditEntry({
      model: 'User',
      operation: 'findUnique',
      args: { where: { id: 'user-9' } },
      result: { id: 'user-9' },
      ...base,
    });
    expect(entry).toBeNull();
  });

  it('no audita si no hay usuario autenticado (operación de sistema/seed)', () => {
    const entry = buildAuditEntry({
      model: 'User',
      operation: 'create',
      args: { data: {} },
      result: { id: 'user-9' },
      userId: undefined,
    });
    expect(entry).toBeNull();
  });
});
