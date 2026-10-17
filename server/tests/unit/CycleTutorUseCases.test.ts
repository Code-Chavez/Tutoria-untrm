import {
  CycleExceptionError,
  CycleTutorApplier,
  InvalidCycleError,
  ListCycleTutorsUseCase,
  NoPeriodForCycleTutorsError,
  RemoveCycleTutorUseCase,
  SetCycleTutorUseCase,
  TutorAlreadyHasCycleError,
} from '@application/use-cases/cycle-tutors/CycleTutorUseCases';
import { TutorNotFoundError, TutorSchoolMismatchError } from '@application/use-cases/assignments/AssignmentErrors';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { CycleTutorAssignment, CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

const assignment = (over: Partial<CycleTutorAssignment> = {}): CycleTutorAssignment => ({
  id: 'a1', periodId: 'p1', schoolId: 's1', cycle: 1, tutorId: 't1', isException: false, note: null, assignedById: 'coord', createdAt: new Date(), acceptanceStatus: 'SIN_SOLICITAR', ...over,
});

describe('tutor por ciclo (fase 3b)', () => {
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'assertSchoolAccess'>>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let cycleTutors: jest.Mocked<CycleTutorRepository>;
  let students: jest.Mocked<StudentRepository>;
  let history: jest.Mocked<TutorAssignmentHistoryRepository>;
  let audit: jest.Mocked<AuditLogRepository>;
  let applier: CycleTutorApplier;

  beforeEach(() => {
    guard = { assertSchoolAccess: jest.fn().mockResolvedValue(undefined) };
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as jest.Mocked<AcademicPeriodRepository>;
    schools = { findById: jest.fn().mockResolvedValue({ id: 's1', name: 'Sistemas' }), findAll: jest.fn() } as unknown as jest.Mocked<SchoolRepository>;
    users = { findById: jest.fn().mockResolvedValue({ id: 't1', roleId: 'rt', isActive: true, schoolId: 's1' }) } as unknown as jest.Mocked<UserRepository>;
    roles = { findByName: jest.fn().mockResolvedValue({ id: 'rt', name: 'Docente Tutor' }) } as unknown as jest.Mocked<RoleRepository>;
    cycleTutors = {
      listBySchool: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue(assignment()),
      listByTutor: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockImplementation(async (i) => assignment(i)),
      remove: jest.fn().mockResolvedValue(true),
      studentsOfCycle: jest.fn().mockResolvedValue([]),
      enrolledByCycle: jest.fn().mockResolvedValue(new Map()),
      requestAcceptance: jest.fn(),
      findByAcceptanceToken: jest.fn(),
      recordResponse: jest.fn(),
    };
    students = { assignTutor: jest.fn().mockResolvedValue(1) } as unknown as jest.Mocked<StudentRepository>;
    history = { create: jest.fn().mockResolvedValue({}), findByStudent: jest.fn() };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
    applier = new CycleTutorApplier(cycleTutors, students, history);
  });

  const set = () => new SetCycleTutorUseCase(guard as unknown as StudentAccessGuard, periods, schools, users, roles, cycleTutors, applier, audit);
  const input = { schoolId: 's1', cycle: 3, tutorId: 't1' };

  describe('fijar el tutor de un ciclo', () => {
    it('lo guarda, asigna a los matriculados sin tutor y lo deja en la bitácora', async () => {
      cycleTutors.find.mockResolvedValue(assignment({ cycle: 3 }));
      cycleTutors.studentsOfCycle.mockResolvedValue([{ studentId: 'e1', tutorId: null }, { studentId: 'e2', tutorId: null }, { studentId: 'e3', tutorId: 'manual' }]);

      const result = await set().execute('coord', input, '10.0.0.1');

      expect(cycleTutors.upsert).toHaveBeenCalledWith(expect.objectContaining({ periodId: 'p1', schoolId: 's1', cycle: 3, tutorId: 't1', isException: false }));
      expect(students.assignTutor).toHaveBeenCalledWith(['e1', 'e2'], 't1', expect.any(Date));
      expect(result).toMatchObject({ assigned: 2, moved: 0 });
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'CYCLE_TUTOR_SET', ipAddress: '10.0.0.1' });
    });

    it('mueve, con historial, a quienes seguían con el tutor de otro ciclo; el tutor puesto a mano no se toca', async () => {
      cycleTutors.find.mockResolvedValue(assignment({ cycle: 3, tutorId: 't1' }));
      cycleTutors.listBySchool.mockResolvedValue([assignment({ cycle: 3, tutorId: 't1' }), assignment({ cycle: 2, tutorId: 'old' })]);
      cycleTutors.studentsOfCycle.mockResolvedValue([{ studentId: 'e1', tutorId: 'old' }, { studentId: 'e2', tutorId: 'manual' }]);

      const result = await set().execute('coord', input);

      expect(result).toMatchObject({ assigned: 0, moved: 1 });
      expect(history.create).toHaveBeenCalledWith({ studentId: 'e1', previousTutorId: 'old', newTutorId: 't1', reason: 'Cambio de tutor del ciclo', reassignedById: 'coord' });
    });

    it('respeta el alcance: quien no coordina la escuela no asigna', async () => {
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());

      await expect(set().execute('otro', input)).rejects.toBeInstanceOf(StudentAccessDeniedError);
      expect(cycleTutors.upsert).not.toHaveBeenCalled();
    });

    it('exige periodo vigente y un ciclo válido', async () => {
      periods.findActive.mockResolvedValue(null);
      await expect(set().execute('coord', input)).rejects.toBeInstanceOf(NoPeriodForCycleTutorsError);
      await expect(set().execute('coord', { ...input, cycle: 0 })).rejects.toBeInstanceOf(InvalidCycleError);
      await expect(set().execute('coord', { ...input, cycle: 11 })).rejects.toBeInstanceOf(InvalidCycleError);
    });

    it('un docente de otra escuela, o sin escuela registrada, no puede ser tutor del ciclo', async () => {
      users.findById.mockResolvedValue({ id: 't1', roleId: 'rt', isActive: true, schoolId: 'mecanica' } as never);
      await expect(set().execute('coord', input)).rejects.toBeInstanceOf(TutorSchoolMismatchError);
      users.findById.mockResolvedValue({ id: 't1', roleId: 'rt', isActive: true, schoolId: null } as never);
      await expect(set().execute('coord', input)).rejects.toBeInstanceOf(TutorSchoolMismatchError);
      users.findById.mockResolvedValue(null);
      await expect(set().execute('coord', input)).rejects.toBeInstanceOf(TutorNotFoundError);
      expect(cycleTutors.upsert).not.toHaveBeenCalled();
    });
  });

  describe('un tutor, un ciclo (y la excepción)', () => {
    beforeEach(() => cycleTutors.listByTutor.mockResolvedValue([assignment({ cycle: 1 })]));

    it('un tutor que ya atiende otro ciclo se rechaza e indica cuál', async () => {
      const error = await set().execute('coord', input).catch((e) => e);

      expect(error).toBeInstanceOf(TutorAlreadyHasCycleError);
      expect(error.otherCycles).toEqual([1]);
      expect(cycleTutors.upsert).not.toHaveBeenCalled();
    });

    it('con la excepción y su motivo se acepta y queda marcada', async () => {
      await set().execute('coord', { ...input, isException: true, note: 'Aceptó por correo el 15/10' });

      expect(cycleTutors.upsert).toHaveBeenCalledWith(expect.objectContaining({ isException: true, note: 'Aceptó por correo el 15/10' }));
    });

    it('la excepción sin motivo se rechaza; tampoco se admiten más de dos ciclos', async () => {
      await expect(set().execute('coord', { ...input, isException: true, note: ' ' })).rejects.toBeInstanceOf(CycleExceptionError);

      cycleTutors.listByTutor.mockResolvedValue([assignment({ cycle: 1 }), assignment({ cycle: 2 })]);
      await expect(set().execute('coord', { ...input, isException: true, note: 'Motivo válido' })).rejects.toBeInstanceOf(CycleExceptionError);
    });

    it('cambiar al mismo tutor de su propio ciclo no cuenta como segundo ciclo', async () => {
      cycleTutors.listByTutor.mockResolvedValue([assignment({ cycle: 3 })]);

      await expect(set().execute('coord', input)).resolves.toBeDefined();
    });
  });

  describe('estudiante cargado después', () => {
    it('queda con el tutor del ciclo si no tenía; uno con tutor puesto a mano no cambia', async () => {
      cycleTutors.find.mockResolvedValue(assignment({ cycle: 4, tutorId: 't9' }));
      await applier.applyToStudent('p1', { id: 'n1', schoolId: 's1', cycle: 4 }, 'coord');
      expect(students.assignTutor).toHaveBeenCalledWith(['n1'], 't9', expect.any(Date));

      students.assignTutor.mockClear();
      cycleTutors.listBySchool.mockResolvedValue([assignment({ cycle: 4, tutorId: 't9' })]);
      await applier.applyToStudent('p1', { id: 'n2', schoolId: 's1', cycle: 4, tutorId: 'manual' }, 'coord');
      expect(students.assignTutor).not.toHaveBeenCalled();
    });

    it('si el ciclo no tiene tutor no hace nada; el que continuó de ciclo pasa al tutor nuevo con historial', async () => {
      cycleTutors.find.mockResolvedValue(null);
      await applier.applyToStudent('p1', { id: 'n1', schoolId: 's1', cycle: 4 }, 'coord');
      expect(students.assignTutor).not.toHaveBeenCalled();

      cycleTutors.find.mockResolvedValue(assignment({ cycle: 5, tutorId: 't9' }));
      cycleTutors.listBySchool.mockResolvedValue([assignment({ cycle: 4, tutorId: 'ant' }), assignment({ cycle: 5, tutorId: 't9' })]);
      await applier.applyToStudent('p1', { id: 'c1', schoolId: 's1', cycle: 5, tutorId: 'ant' }, 'coord');
      expect(history.create).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'c1', previousTutorId: 'ant', newTutorId: 't9' }));
    });
  });

  it('lista los diez ciclos con su tutor y cuántos matriculados faltan por asignar', async () => {
    cycleTutors.listBySchool.mockResolvedValue([assignment({ cycle: 2, tutorId: 't1', isException: true, note: 'x' })]);
    cycleTutors.enrolledByCycle.mockResolvedValue(new Map([[2, { total: 8, withoutTutor: 3 }]]));

    const result = await new ListCycleTutorsUseCase(guard as unknown as StudentAccessGuard, periods, cycleTutors).execute('coord', 's1');

    expect(result.cycles).toHaveLength(10);
    expect(result.cycles[1]).toMatchObject({ cycle: 2, assignment: { tutorId: 't1', isException: true }, enrolled: 8, withoutTutor: 3 });
    expect(result.cycles[0]).toMatchObject({ cycle: 1, assignment: null, enrolled: 0 });
  });

  it('quitar al tutor del ciclo lo deja en la bitácora y no toca a los estudiantes', async () => {
    const removed = await new RemoveCycleTutorUseCase(guard as unknown as StudentAccessGuard, periods, cycleTutors, audit).execute('coord', 's1', 3);

    expect(removed).toBe(true);
    expect(students.assignTutor).not.toHaveBeenCalled();
    expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'CYCLE_TUTOR_REMOVED' });
  });
});
