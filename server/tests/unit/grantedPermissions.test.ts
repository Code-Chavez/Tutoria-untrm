import { grantedPermissionCodes } from '@application/use-cases/auth/grantedPermissions';

describe('grantedPermissionCodes', () => {
  const perm = (code: string) => ({ id: code, code, description: code });

  it('devuelve los códigos del rol, ordenados', () => {
    expect(grantedPermissionCodes({ permissions: [perm('students:read'), perm('reports:read')], isActive: true })).toEqual(['reports:read', 'students:read']);
  });
  it('un rol desactivado, inexistente o sin lista no concede ninguno', () => {
    expect(grantedPermissionCodes({ permissions: [perm('students:read')], isActive: false })).toEqual([]);
    expect(grantedPermissionCodes(null)).toEqual([]);
    expect(grantedPermissionCodes({ permissions: undefined as never })).toEqual([]);
  });
});
