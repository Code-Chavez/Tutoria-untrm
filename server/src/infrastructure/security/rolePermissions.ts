import { prisma } from '@infrastructure/database/prisma';
import { TtlCache } from '@infrastructure/cache/TtlCache';

// Mismo desfase máximo que la caché de roles: los permisos de un rol solo cambian al sembrar.
const cache = new TtlCache<string[]>(30_000);

/** Códigos de permiso de un rol (una consulta cada 30 s en lugar de una por petición). */
export function permissionCodesForRole(roleId: string): Promise<string[]> {
  return cache.getOrLoad(roleId, async () => {
    const rows = await prisma.rolePermission.findMany({ where: { roleId }, select: { permission: { select: { code: true } } } });
    return rows.map((row) => row.permission.code);
  });
}

/** Solo para pruebas: olvida lo guardado. */
export function clearRolePermissionCache(): void {
  cache.clear();
}
