import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { REFERRAL_ASPECTS } from '@domain/entities/StudentReferral';
import { ReferralConstancia } from '@application/dtos/referral.dto';
import { ReferralForbiddenError, ReferralNotFoundError } from './ReferralErrors';
import { canViewReferral, resolveReferralActor } from './referralAccess';

/** Reúne los datos ya resueltos (nombres) para imprimir la constancia de derivación (HU-28). */
export class GetReferralConstanciaUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly roles: RoleRepository,
    private readonly faculties: FacultyRepository,
  ) {}

  async execute(referralId: string, requesterId: string): Promise<ReferralConstancia> {
    const actor = await resolveReferralActor(this.users, this.roles, requesterId);

    const referral = await this.referrals.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    // La constancia contiene el motivo y los aspectos personales del tutorado: misma regla que el detalle.
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();

    const student = await this.students.findById(referral.studentId);
    const referredBy = await this.users.findById(referral.referredById);
    const school = student ? await this.schools.findById(student.schoolId) : null;
    const faculty = school ? (await this.faculties.findAll()).find((f) => f.id === school.facultyId) : undefined;
    const tutor = student?.tutorId ? await this.users.findById(student.tutorId) : null;

    const aspectByCode = new Map(REFERRAL_ASPECTS.map((a) => [a.code, a]));
    const aspects = referral.checkedAspects.map((code) => {
      const aspect = aspectByCode.get(code);
      return { category: aspect?.category ?? 'Otros', label: aspect?.label ?? code };
    });

    return {
      referralId: referral.id,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
      studentCode: student?.studentCode ?? '—',
      studentEmail: student?.email ?? null,
      studentPhone: student?.phone ?? null,
      cycle: student?.cycle ?? 0,
      schoolName: school?.name ?? 'Sin escuela',
      facultyName: faculty?.name ?? '—',
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Sin tutor asignado',
      referredByName: referredBy ? `${referredBy.firstName} ${referredBy.lastName}` : 'Desconocido',
      referredByEmail: referredBy?.email ?? null,
      status: referral.status,
      reason: referral.reason,
      service: referral.service,
      receivingInstance: referral.receivingInstance,
      aspects,
      createdAt: referral.createdAt,
    };
  }
}
