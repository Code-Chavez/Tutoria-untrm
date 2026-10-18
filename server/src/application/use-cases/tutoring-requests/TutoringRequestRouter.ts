import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { NoRoutingTargetError } from './TutoringRequestErrors';

const DBU_ROLE_NAME = 'Administrador DBU';

/** A quién llega una solicitud: el tutor del estudiante, la coordinación de su escuela o, en último caso, la DBU. */
export type RecipientKind = 'tutor' | 'coordinator' | 'dbu';

export interface RequestRecipient {
  routedToId: string;
  routedToRole: 'tutor' | 'coordinator';
  kind: RecipientKind;
}

/**
 * Una sola regla para decidir a quién llega una solicitud de tutoría: la usan el registro (para enrutarla) y la consulta previa
 * del estudiante (para decirle, antes de enviarla, quién la recibirá), de modo que lo que se promete es lo que ocurre.
 * Tutor asignado y activo → coordinador de la escuela → un Administrador DBU activo (respaldo: la solicitud nunca se pierde).
 */
export class TutoringRequestRouter {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async resolve(tutorId: string | null | undefined, schoolId: string): Promise<RequestRecipient> {
    // Un tutor con la cuenta desactivada no puede atender: la solicitud pasa a la coordinación en vez de quedar sin responsable.
    if (tutorId && (await this.users.findById(tutorId))?.isActive) return { routedToId: tutorId, routedToRole: 'tutor', kind: 'tutor' };

    const school = await this.schools.findById(schoolId);
    if (school?.coordinatorId) return { routedToId: school.coordinatorId, routedToRole: 'coordinator', kind: 'coordinator' };

    // Respaldo: la escuela no tiene coordinador asignado todavía.
    const dbuRole = await this.roles.findByName(DBU_ROLE_NAME);
    const fallback = dbuRole ? (await this.users.findAll({ isActive: true, roleId: dbuRole.id }))[0] : undefined;
    if (!fallback) throw new NoRoutingTargetError();
    return { routedToId: fallback.id, routedToRole: 'coordinator', kind: 'dbu' };
  }
}
