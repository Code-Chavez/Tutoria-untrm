import { UserAccessPolicy } from '../entities/UserAccessPolicy';

export interface UserAccessAuditContext {
  userId: string;
  ipAddress: string | null;
}

export interface UserAccessPolicyRepository {
  findByUserId(userId: string): Promise<UserAccessPolicy | null>;
  /** Guarda (crea o reemplaza) el alcance de la persona y deja la bitácora en la misma transacción; sube la revisión. */
  save(
    policy: Pick<UserAccessPolicy, 'userId' | 'roleId' | 'kind' | 'schoolIds' | 'facultyIds' | 'service'>,
    audit: UserAccessAuditContext,
    roleName: string,
  ): Promise<UserAccessPolicy>;
}
