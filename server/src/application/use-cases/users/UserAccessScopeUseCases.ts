import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { UserAccessPolicyRepository } from '@domain/repositories/UserAccessPolicyRepository';
import { RoleNotFoundError, RoleTargetUserNotFoundError } from '../roles/RoleErrors';
import {
  ADMIN_ROLE_NAME,
  AccessScopeInput,
  AccessScopeNotConfigurableError,
  STUDENT_ROLE_NAME,
  normalizeAccessScope,
} from './userAccessScope';

export interface UserAccessView {
  userId: string;
  role: { id: string; name: string };
  /** Alcance guardado para el rol actual; null si no hay (rige el comportamiento por defecto del rol) o si quedó de otro rol. */
  policy: Pick<UserAccessPolicy, 'kind' | 'schoolIds' | 'facultyIds' | 'service' | 'revision'> | null;
  /** STORED: configurado aquí; DEFAULT: sin configurar; OUTDATED: quedó de un rol anterior y no se aplica. */
  source: 'STORED' | 'DEFAULT' | 'OUTDATED';
  /** Si el alcance se puede cambiar desde la pantalla. */
  configurable: boolean;
}

const toView = (policy: UserAccessPolicy | null, user: { id: string; roleId: string }, role: { id: string; name: string }): UserAccessView => {
  const configurable = role.name !== STUDENT_ROLE_NAME;
  const base = { userId: user.id, role: { id: role.id, name: role.name }, configurable };
  if (!policy) return { ...base, policy: null, source: 'DEFAULT' };
  if (policy.roleId !== user.roleId) return { ...base, policy: null, source: 'OUTDATED' };
  const { kind, schoolIds, facultyIds, service, revision } = policy;
  return { ...base, policy: { kind, schoolIds, facultyIds, service, revision }, source: 'STORED' };
};

export class GetUserAccessUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly policies: UserAccessPolicyRepository,
  ) {}

  async execute(userId: string): Promise<UserAccessView> {
    const user = await this.users.findById(userId);
    if (!user) throw new RoleTargetUserNotFoundError(userId);
    const role = await this.roles.findById(user.roleId);
    if (!role) throw new RoleNotFoundError(user.roleId);
    return toView(await this.policies.findByUserId(userId), user, role);
  }
}

/**
 * Define hasta dónde llega una persona con su rol actual (propios, escuelas, facultades, servicio o institución). Solo limita
 * datos: no concede permisos. Nadie cambia su propio alcance, el tutorado no se amplía y la administración conserva la institución.
 */
export class SetUserAccessUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly policies: UserAccessPolicyRepository,
  ) {}

  async execute(userId: string, input: AccessScopeInput, actingUserId: string, ipAddress: string | null): Promise<UserAccessView> {
    const user = await this.users.findById(userId);
    if (!user) throw new RoleTargetUserNotFoundError(userId);
    const role = await this.roles.findById(user.roleId);
    if (!role) throw new RoleNotFoundError(user.roleId);

    if (userId === actingUserId) throw new AccessScopeNotConfigurableError('No puede cambiar su propio alcance: pídalo a otra persona con administración.');
    if (role.name === STUDENT_ROLE_NAME) throw new AccessScopeNotConfigurableError('El alcance del tutorado no se amplía: solo ve lo suyo desde su portal.');
    const scope = await normalizeAccessScope(input, this.schools, this.faculties);
    if (role.name === ADMIN_ROLE_NAME && scope.kind !== 'INSTITUTION') {
      throw new AccessScopeNotConfigurableError('La administración del sistema conserva el alcance de toda la institución.');
    }

    const saved = await this.policies.save({ userId, roleId: role.id, ...scope }, { userId: actingUserId, ipAddress }, role.name);
    return toView(saved, user, role);
  }
}
