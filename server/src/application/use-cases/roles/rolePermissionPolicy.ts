import { PERMISSION_CATALOG } from '@domain/permissionCatalog';
import { PermissionNotGrantableError, UnknownPermissionError } from './RoleErrors';

/**
 * Permisos que ningún rol configurable puede incluir: solo los roles base los tienen. VALOR PROVISIONAL a confirmar con la
 * DBU/TI (LEV-R13): la administración del sistema no se delega.
 */
export const NON_DELEGABLE_PERMISSIONS: readonly string[] = ['admin:system'];

const KNOWN = new Set<string>(PERMISSION_CATALOG.map((p) => p.code));

/**
 * Valida el conjunto pedido: sin repetidos, todos del catálogo, ninguno no delegable y, además, solo permisos que quien los otorga
 * tiene (nadie concede más de lo que posee). Devuelve la lista sin repetidos y ordenada.
 */
export function validateGrantablePermissions(requested: string[], actorPermissions: string[]): string[] {
  const unique = [...new Set(requested)];
  const unknown = unique.filter((code) => !KNOWN.has(code));
  if (unknown.length > 0) throw new UnknownPermissionError(unknown);
  const actor = new Set(actorPermissions);
  const notGrantable = unique.filter((code) => NON_DELEGABLE_PERMISSIONS.includes(code) || !actor.has(code));
  if (notGrantable.length > 0) throw new PermissionNotGrantableError(notGrantable);
  return unique.sort();
}
