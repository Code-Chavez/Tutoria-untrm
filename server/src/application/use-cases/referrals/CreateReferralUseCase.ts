import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { CreateReferralInput } from '@application/dtos/referral.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

/**
 * Ficha de derivación (HU-28, Anexo N°6): el docente tutor registra el
 * checklist de aspectos observados, el motivo y el servicio destino. El
 * enrutamiento validado/sugerido por aspecto (Art. 21) es HU-29; aquí el
 * servicio ya llega elegido y solo se valida que sea uno de los 5 válidos
 * (ver validators).
 */
export class CreateReferralUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(
    studentId: string,
    referredById: string,
    input: CreateReferralInput,
  ): Promise<StudentReferral> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    return this.referrals.create({
      studentId,
      referredById,
      checkedAspects: input.checkedAspects,
      reason: input.reason,
      service: input.service,
    });
  }
}
