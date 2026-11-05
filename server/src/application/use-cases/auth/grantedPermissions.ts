import { Role } from '@domain/entities/Role';

/**
 * Códigos que el rol concede hoy. Un rol desactivado o inexistente no concede ninguno (igual que el servidor al autorizar).
 * Solo sirve para que el cliente decida qué mostrar: la autorización real sigue siendo la de cada ruta.
 */
export function grantedPermissionCodes(role: Pick<Role, 'permissions' | 'isActive'> | null | undefined): string[] {
  if (!role || role.isActive === false) return [];
  return (role.permissions ?? []).map((p) => p.code).sort();
}
