import { Role } from '../entities/Role';

export interface RoleAuditContext {
  userId: string;
  ipAddress: string | null;
}

/** Administración de roles configurables (LEV-R11). Cada operación y su registro de bitácora se guardan en una sola transacción. */
export interface RoleAdminRepository {
  /** Crea el rol (no base) con los permisos indicados (códigos ya validados contra el catálogo). */
  createWithPermissions(data: { name: string; description: string; permissionCodes: string[] }, audit: RoleAuditContext): Promise<Role>;
  /** Reemplaza descripción y/o conjunto de permisos de un rol no base. Devuelve el rol y qué permisos se añadieron/quitaron. */
  update(id: string, data: { description?: string; permissionCodes?: string[] }, audit: RoleAuditContext): Promise<{ role: Role; added: string[]; removed: string[] }>;
  setActive(id: string, isActive: boolean, audit: RoleAuditContext): Promise<Role>;
  countUsers(roleId: string): Promise<number>;
}
