import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RecipientKind, TutoringRequestRouter } from './TutoringRequestRouter';

export interface OwnRequestRecipient {
  kind: RecipientKind;
  name: string;
}

/**
 * A quién llegará la solicitud del propio estudiante, ANTES de enviarla (con la misma regla con que se enruta). Null si su cuenta
 * aún no está vinculada a un registro de estudiante o si no hay a quién enrutar.
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
      return user ? { kind: target.kind, name: `${user.firstName} ${user.lastName}` } : null;
    } catch {
      return null;
    }
  }
}
