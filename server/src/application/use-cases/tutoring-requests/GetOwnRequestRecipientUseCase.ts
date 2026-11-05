import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { NoRoutingTargetError } from './TutoringRequestErrors';
import { RecipientKind, TutoringRequestRouter } from './TutoringRequestRouter';

/** `none`: la cuenta está vinculada pero hoy no hay nadie que pueda recibirla; no se debe prometer atención. */
export interface OwnRequestRecipient {
  kind: RecipientKind | 'none';
  name: string;
}

/**
 * A quién llegará la solicitud del propio estudiante, ANTES de enviarla (con la misma regla con que se enruta). Null si su cuenta
 * aún no está vinculada a un registro de estudiante; `none` si no hay a quién enrutar (el envío fallaría: no se promete atención).
 */
export class GetOwnRequestRecipientUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly router: TutoringRequestRouter,
  ) {}

  async execute(userId: string): Promise<OwnRequestRecipient | null> {
    const student = await this.students.findByUserId(userId);
    if (!student) return null;
    try {
      const target = await this.router.resolve(student.tutorId, student.schoolId);
      const user = await this.users.findById(target.routedToId);
      return user ? { kind: target.kind, name: `${user.firstName} ${user.lastName}` } : { kind: 'none', name: '' };
    } catch (error) {
      if (error instanceof NoRoutingTargetError) return { kind: 'none', name: '' };
      throw error;
    }
  }
}
