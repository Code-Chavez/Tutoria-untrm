import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { EvaluationResultsForbiddenError } from './EvaluationErrors';

/**
 * Qué respuestas de evaluación puede ver quien consulta (A05): la DBU, todas (`undefined`); el Coordinador, solo las de
 * tutorados de las escuelas que coordina; cualquier otro rol, ninguna. Se resuelve aquí, en el servidor, y no con los
 * filtros que envía el cliente, que pueden omitirse o cambiarse. Misma regla que los indicadores y los tutorados.
 */
export async function evaluationScopeFor(
  users: UserRepository,
  roles: RoleRepository,
  schools: SchoolRepository,
  requesterId: string,
): Promise<{ schoolIds?: string[] }> {
  const requester = await users.findById(requesterId);
  if (!requester || requester.isActive === false) throw new EvaluationResultsForbiddenError();

  const role = await roles.findById(requester.roleId);
  if (role?.name === 'Administrador DBU') return {};
  if (role?.name === 'Coordinador') {
    const coordinated = (await schools.findAll()).filter((s) => s.coordinatorId === requesterId);
    return { schoolIds: coordinated.map((s) => s.id) };
  }
  throw new EvaluationResultsForbiddenError();
}
