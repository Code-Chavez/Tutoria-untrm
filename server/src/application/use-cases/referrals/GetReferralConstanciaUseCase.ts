import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { REFERRAL_ASPECTS } from '@domain/entities/StudentReferral';
import { ReferralConstancia } from '@application/dtos/referral.dto';
import { ReferralNotFoundError } from './ReferralErrors';

/** Reúne los datos ya resueltos (nombres) para imprimir la constancia de derivación (HU-28). */
export class GetReferralConstanciaUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(referralId: string): Promise<ReferralConstancia> {
    const referral = await this.referrals.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    const student = await this.students.findById(referral.studentId);
    const referredBy = await this.users.findById(referral.referredById);
    const school = student ? await this.schools.findById(student.schoolId) : null;

    const aspectByCode = new Map(REFERRAL_ASPECTS.map((a) => [a.code, a]));
    const aspects = referral.checkedAspects.map((code) => {
      const aspect = aspectByCode.get(code);
      return { category: aspect?.category ?? 'Otros', label: aspect?.label ?? code };
    });

    return {
      referralId: referral.id,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
      studentCode: student?.studentCode ?? '—',
      cycle: student?.cycle ?? 0,
      schoolName: school?.name ?? 'Sin escuela',
      referredByName: referredBy ? `${referredBy.firstName} ${referredBy.lastName}` : 'Desconocido',
      reason: referral.reason,
      service: referral.service,
      aspects,
      createdAt: referral.createdAt,
    };
  }
}
