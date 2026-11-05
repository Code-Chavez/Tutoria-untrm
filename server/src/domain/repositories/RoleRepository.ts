import { Role } from '../entities/Role';

export interface RoleCreationAudit {
  userId: string;
  ipAddress: string | null;
}

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  /**
   * Con `audit`, el rol y su registro de bitácora se guardan en una sola transacción: si uno falla, no queda ninguno.
   */
  create(data: { name: string; description: string }, audit?: RoleCreationAudit): Promise<Role>;
}
