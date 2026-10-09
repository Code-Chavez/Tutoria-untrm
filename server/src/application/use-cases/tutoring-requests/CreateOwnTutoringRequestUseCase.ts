import { TutoringRequest } from '@domain/entities/TutoringRequest';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { CreateOwnTutoringRequestInput } from '@application/dtos/tutoringRequest.dto';
import { CreateTutoringRequestUseCase } from './CreateTutoringRequestUseCase';
import { StudentProfileNotLinkedError } from './TutoringRequestErrors';

/**
 * Autoservicio de solicitud de tutoría (Art. 19.b): el propio tutorado la
 * registra desde su cuenta, sin que el personal la registre en su nombre.
 * Resuelve el estudiante a partir de la cuenta autenticada en vez de recibir
 * el studentId del cliente, y delega el enrutamiento al caso de uso existente.
 *
 * No pasa por el alcance del personal (un tutorado no tiene alcance sobre otros): la identidad
 * del estudiante sale de su cuenta, nunca de la petición.
 */
export class CreateOwnTutoringRequestUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly createTutoringRequestUseCase: CreateTutoringRequestUseCase,
  ) {}

  async execute(userId: string, input: CreateOwnTutoringRequestInput): Promise<TutoringRequest> {
    const student = await this.students.findByUserId(userId);
    if (!student) {
      throw new StudentProfileNotLinkedError();
    }

    return this.createTutoringRequestUseCase.registerFor(student, userId, {
      source: 'STUDENT',
      caseType: input.caseType,
      reason: input.reason,
    });
  }
}
