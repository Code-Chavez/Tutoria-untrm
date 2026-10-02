import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { School } from '@domain/entities/School';
import { WorkPlanForbiddenError } from './WorkPlanErrors';

/**
 * Escuelas cuyo plan de trabajo puede ver/elaborar el solicitante (Art.
 * 17.a): la DBU, todas; el Coordinador, solo las que coordina.
 */
export async function resolveManageableSchools(
  users: UserRepository,
  roles: RoleRepository,
  schools: SchoolRepository,
  requesterId: string,
): Promise<School[]> {
  const requester = await users.findById(requesterId);
  if (!requester) throw new WorkPlanForbiddenError();

  const role = await roles.findById(requester.roleId);
  if (!role) throw new WorkPlanForbiddenError();

  const all = await schools.findAll();
  if (role.name === 'Administrador DBU') return all;
  if (role.name === 'Coordinador') return all.filter((s) => s.coordinatorId === requesterId);
  throw new WorkPlanForbiddenError();
}
