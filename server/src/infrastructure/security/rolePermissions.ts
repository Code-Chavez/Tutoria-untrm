import { prisma } from '@infrastructure/database/prisma';
import { TtlCache } from '@infrastructure/cache/TtlCache';

// Desfase máximo de 30 s; al editar o desactivar un rol se invalida de inmediato (clearRolePermissionCache).
const cache = new TtlCache<string[]>(30_000);

/** Códigos de permiso de un rol (una consulta cada 30 s en lugar de una por petición). */
export function permissionCodesForRole(roleId: string): Promise<string[]> {
  return cache.getOrLoad(roleId, async () => {
    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isActive: true } });
    if (role && role.isActive === false) return []; // un rol desactivado no concede nada
    const rows = await prisma.rolePermission.findMany({ where: { roleId }, select: { permission: { select: { code: true } } } });
    return rows.map((row) => row.permission.code);
  });
}

/** Solo para pruebas: olvida lo guardado. */
export function clearRolePermissionCache(): void {
  cache.clear();
}
