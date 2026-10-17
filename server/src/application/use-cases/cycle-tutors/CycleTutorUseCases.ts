import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { assertActiveTutor } from '@application/use-cases/assignments/TutorValidation';
import { TutorSchoolMismatchError } from '@application/use-cases/assignments/AssignmentErrors';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { CycleTutorAssignment, CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

export const MAX_CYCLE = 10;
const MOVE_REASON = 'Cambio de tutor del ciclo';

export class NoPeriodForCycleTutorsError extends Error {
  constructor() {
    super('No hay un periodo vigente: abra el periodo para asignar los tutores por ciclo');
    this.name = 'NoPeriodForCycleTutorsError';
  }
}
export class InvalidCycleError extends Error {
  constructor() {
    super(`El ciclo debe ser un número entero entre 1 y ${MAX_CYCLE}`);
    this.name = 'InvalidCycleError';
  }
}
export class CycleTutorSchoolNotFoundError extends Error {
  constructor() {
    super('La escuela no existe');
    this.name = 'CycleTutorSchoolNotFoundError';
  }
}
/** Un tutor atiende un solo ciclo; un segundo ciclo es una excepción que se justifica y se registra. */
export class TutorAlreadyHasCycleError extends Error {
  constructor(public readonly otherCycles: number[]) {
    super(`El docente ya es tutor del ciclo ${otherCycles.join(' y ')} en este periodo. Un tutor atiende un solo ciclo: si la facultad no tiene más docentes, registre una excepción con su motivo`);
    this.name = 'TutorAlreadyHasCycleError';
  }
}
export class CycleExceptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CycleExceptionError';
  }
}

function assertCycle(cycle: unknown): asserts cycle is number {
  if (!Number.isInteger(cycle) || (cycle as number) < 1 || (cycle as number) > MAX_CYCLE) throw new InvalidCycleError();
}

/**
 * Aplica el tutor de un ciclo a los estudiantes matriculados: toma a los que no tienen tutor y mueve (con historial) a los
 * que seguían con el tutor de otro ciclo de la misma escuela. Un tutor puesto a mano por la coordinación no se toca.
 */
export class CycleTutorApplier {
  constructor(
    private readonly cycleTutors: CycleTutorRepository,
    private readonly students: StudentRepository,
    private readonly history: TutorAssignmentHistoryRepository,
  ) {}

  async applyToCycle(periodId: string, schoolId: string, cycle: number, actingUserId: string): Promise<{ assigned: number; moved: number }> {
    const current = await this.cycleTutors.find(periodId, schoolId, cycle);
    if (!current) return { assigned: 0, moved: 0 };
    const cycleTutorIds = new Set((await this.cycleTutors.listBySchool(periodId, schoolId)).map((a) => a.tutorId));
    const roster = await this.cycleTutors.studentsOfCycle(periodId, schoolId, cycle);
    const toAssign = roster.filter((s) => !s.tutorId).map((s) => s.studentId);
    const toMove = roster.filter((s) => s.tutorId && s.tutorId !== current.tutorId && cycleTutorIds.has(s.tutorId));
    const now = new Date();
    if (toAssign.length > 0) await this.students.assignTutor(toAssign, current.tutorId, now);
    for (const student of toMove) {
      await this.students.assignTutor([student.studentId], current.tutorId, now);
      await this.history.create({ studentId: student.studentId, previousTutorId: student.tutorId, newTutorId: current.tutorId, reason: MOVE_REASON, reassignedById: actingUserId });
    }
    return { assigned: toAssign.length, moved: toMove.length };
  }

  /** Para un estudiante recién cargado o que continúa en otro ciclo. */
  async applyToStudent(periodId: string, student: { id: string; schoolId: string; cycle: number; tutorId?: string | null }, actingUserId: string): Promise<void> {
    const current = await this.cycleTutors.find(periodId, student.schoolId, student.cycle);
    if (!current || student.tutorId === current.tutorId) return;
    if (student.tutorId) {
      const cycleTutorIds = new Set((await this.cycleTutors.listBySchool(periodId, student.schoolId)).map((a) => a.tutorId));
      if (!cycleTutorIds.has(student.tutorId)) return; // tutor puesto a mano: se respeta
    }
    await this.students.assignTutor([student.id], current.tutorId, new Date());
    if (student.tutorId) {
      await this.history.create({ studentId: student.id, previousTutorId: student.tutorId, newTutorId: current.tutorId, reason: MOVE_REASON, reassignedById: actingUserId });
    }
  }
}

export interface CycleRow {
  cycle: number;
  assignment: Pick<CycleTutorAssignment, 'tutorId' | 'isException' | 'note'> | null;
  enrolled: number;
  withoutTutor: number;
}

export class ListCycleTutorsUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly cycleTutors: CycleTutorRepository,
  ) {}

  async execute(actingUserId: string, schoolId: string): Promise<{ periodId: string; periodName: string; cycles: CycleRow[] }> {
    await this.guard.assertSchoolAccess(actingUserId, schoolId);
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodForCycleTutorsError();
    const [assignments, counts] = await Promise.all([this.cycleTutors.listBySchool(period.id, schoolId), this.cycleTutors.enrolledByCycle(period.id, schoolId)]);
    const byCycle = new Map(assignments.map((a) => [a.cycle, a]));
    const cycles: CycleRow[] = Array.from({ length: MAX_CYCLE }, (_, i) => i + 1).map((cycle) => {
      const a = byCycle.get(cycle);
      const c = counts.get(cycle);
      return { cycle, assignment: a ? { tutorId: a.tutorId, isException: a.isException, note: a.note ?? null } : null, enrolled: c?.total ?? 0, withoutTutor: c?.withoutTutor ?? 0 };
    });
    return { periodId: period.id, periodName: period.name, cycles };
  }
}

export interface SetCycleTutorInput {
  schoolId: string;
  cycle: number;
  tutorId: string;
  isException?: boolean;
  note?: string | null;
}

export class SetCycleTutorUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly applier: CycleTutorApplier,
    private readonly audit: AuditLogRepository,
  ) {}

  async execute(actingUserId: string, input: SetCycleTutorInput, ip?: string | null) {
    assertCycle(input.cycle);
    await this.guard.assertSchoolAccess(actingUserId, input.schoolId);
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodForCycleTutorsError();
    const school = await this.schools.findById(input.schoolId);
    if (!school) throw new CycleTutorSchoolNotFoundError();

    const tutor = await assertActiveTutor(this.users, this.roles, input.tutorId);
    // Solo tutorea a su escuela; un tutor sin escuela registrada no puede ser tutor de un ciclo hasta que se la indiquen.
    if (tutor.schoolId !== input.schoolId) throw new TutorSchoolMismatchError();

    const others = (await this.cycleTutors.listByTutor(period.id, tutor.id)).filter((a) => !(a.schoolId === input.schoolId && a.cycle === input.cycle));
    const isException = others.length > 0;
    let note: string | null = null;
    if (isException) {
      if (!input.isException) throw new TutorAlreadyHasCycleError(others.map((a) => a.cycle).sort((a, b) => a - b));
      if (others.length >= 2) throw new CycleExceptionError('Un docente no puede atender más de dos ciclos, ni siquiera por excepción');
      note = input.note?.trim() ?? '';
      if (note.length < 5) throw new CycleExceptionError('La excepción necesita un motivo (por ejemplo, el docente aceptó por correo asumir el ciclo)');
    }

    const assignment = await this.cycleTutors.upsert({
      periodId: period.id,
      schoolId: input.schoolId,
      cycle: input.cycle,
      tutorId: tutor.id,
      isException,
      note,
      assignedById: actingUserId,
    });
    const applied = await this.applier.applyToCycle(period.id, input.schoolId, input.cycle, actingUserId);
    await this.audit.create({
      userId: actingUserId,
      action: 'CYCLE_TUTOR_SET',
      entity: 'CycleTutorAssignment',
      entityId: assignment.id,
      details: `${school.name} · ciclo ${input.cycle}${isException ? ' (excepción)' : ''} · ${applied.assigned} asignados, ${applied.moved} movidos`,
      ipAddress: ip ?? null,
    });
    return { assignment, ...applied };
  }
}

export class RemoveCycleTutorUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  /** Quita al tutor del ciclo; los estudiantes conservan el tutor que ya tienen (se reasignan con motivo, como siempre). */
  async execute(actingUserId: string, schoolId: string, cycle: number, ip?: string | null): Promise<boolean> {
    assertCycle(cycle);
    await this.guard.assertSchoolAccess(actingUserId, schoolId);
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodForCycleTutorsError();
    const removed = await this.cycleTutors.remove(period.id, schoolId, cycle);
    if (removed) {
      await this.audit.create({ userId: actingUserId, action: 'CYCLE_TUTOR_REMOVED', entity: 'School', entityId: schoolId, details: `Ciclo ${cycle}`, ipAddress: ip ?? null });
    }
    return removed;
  }
}
