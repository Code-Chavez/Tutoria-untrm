import { scopeCovers } from '@application/access/StudentAccessGuard';
import { ListStudentsUseCase } from '@application/use-cases/students/ListStudentsUseCase';
import { CreateStudentUseCase } from '@application/use-cases/students/CreateStudentUseCase';
import { UpdateStudentUseCase } from '@application/use-cases/students/UpdateStudentUseCase';
import { MarkStudentRiskUseCase } from '@application/use-cases/students/MarkStudentRiskUseCase';
import { ImportStudentsUseCase } from '@application/use-cases/students/ImportStudentsUseCase';
import { StudentAccessDeniedError, StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { CreateInterviewUseCase } from '@application/use-cases/interviews/CreateInterviewUseCase';
import { ListInterviewsByStudentUseCase } from '@application/use-cases/interviews/ListInterviewsByStudentUseCase';
import { CreateFollowUpUseCase } from '@application/use-cases/follow-ups/CreateFollowUpUseCase';
import { ListFollowUpsByStudentUseCase } from '@application/use-cases/follow-ups/ListFollowUpsByStudentUseCase';
import { GetSupportContactUseCase } from '@application/use-cases/support-contacts/GetSupportContactUseCase';
import { UpsertSupportContactUseCase } from '@application/use-cases/support-contacts/UpsertSupportContactUseCase';
import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import { ListSessionsUseCase } from '@application/use-cases/sessions/ListSessionsUseCase';
import { ListSessionEvidenceUseCase } from '@application/use-cases/sessions/ListSessionEvidenceUseCase';
import { GetSessionEvidenceFileUseCase } from '@application/use-cases/sessions/GetSessionEvidenceFileUseCase';
import { SessionNotFoundError } from '@application/use-cases/sessions/SessionErrors';
import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import { ReassignStudentUseCase } from '@application/use-cases/assignments/ReassignStudentUseCase';
import { StudentsAlreadyAssignedError, TutorNotFoundError } from '@application/use-cases/assignments/AssignmentErrors';
import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import { ListTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';
import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';
import { GetScheduleAttendanceReportUseCase } from '@application/use-cases/reports/GetScheduleAttendanceReportUseCase';
import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { buildWorld, session, STUDENTS } from '../helpers/world';

const ids = (list: { id: string }[]) => list.map((s) => s.id).sort();

describe('Alcance sobre los tutorados con la política real (A03, Art. 9.a y 14.c)', () => {
  let w: ReturnType<typeof buildWorld>;
  beforeEach(() => {
    w = buildWorld();
  });

  describe('scopeFor / scopeCovers', () => {
    it.each([
      ['dbu', 'ALL'],
      ['coordA', 'SCHOOLS'],
      ['tutorA1', 'TUTOR'],
      ['vice', 'NONE'],
      ['prof', 'NONE'],
      ['pupil', 'NONE'],
      ['gone', 'NONE'], // cuenta desactivada
      ['no-existe', 'NONE'],
    ])('%s → %s', async (who, kind) => {
      expect((await w.guard.scopeFor(who)).kind).toBe(kind);
    });

    it('el coordinador cubre solo las escuelas que coordina y el tutor solo a sus asignados', async () => {
      const coord = await w.guard.scopeFor('coordA');
      expect(STUDENTS.filter((s) => scopeCovers(coord, s)).map((s) => s.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
      const tutor = await w.guard.scopeFor('tutorA1');
      expect(STUDENTS.filter((s) => scopeCovers(tutor, s)).map((s) => s.id)).toEqual(['a1', 'a2']);
    });

    it('un coordinador sin escuelas a su cargo no cubre a nadie', async () => {
      w.schools.findAll.mockResolvedValue([]);
      expect(STUDENTS.some((s) => scopeCovers({ kind: 'SCHOOLS', schoolIds: [] }, s))).toBe(false);
    });
  });

  describe('assertAccess: 404 fuera del alcance, sin revelar que el tutorado existe', () => {
    it.each([
      ['dbu', 'b1', true],
      ['coordA', 'a4', true],
      ['coordA', 'b1', false],
      ['coordB', 'a1', false],
      ['tutorA1', 'a1', true],
      ['tutorA1', 'a3', false], // misma escuela, otro tutor
      ['tutorA1', 'a4', false], // sin tutor
      ['tutorB', 'a1', false],
      ['vice', 'a1', false],
      ['pupil', 'a1', false],
      ['gone', 'a1', false],
    ])('%s sobre %s → %s', async (who, student, allowed) => {
      const result = w.guard.assertAccess(who, student);
      if (allowed) await expect(result).resolves.toMatchObject({ id: student });
      else await expect(result).rejects.toBeInstanceOf(StudentNotFoundError);
    });

    it('un tutorado inexistente y uno ajeno dan exactamente la misma respuesta', async () => {
      const ajeno = await w.guard.assertAccess('tutorA1', 'b1').catch((e) => e);
      const inexistente = await w.guard.assertAccess('tutorA1', 'zzz').catch((e) => e);
      expect(ajeno).toBeInstanceOf(StudentNotFoundError);
      expect(inexistente).toBeInstanceOf(StudentNotFoundError);
      expect(ajeno.message.replace('b1', 'X')).toBe(inexistente.message.replace('zzz', 'X'));
    });
  });

  describe('listado de tutorados', () => {
    const list = (who: string, filters = {}) => new ListStudentsUseCase(w.students, w.guard).execute(who, filters);

    it('cada rol ve solo lo suyo', async () => {
      expect(ids(await list('dbu'))).toEqual(['a1', 'a2', 'a3', 'a4', 'b1']);
      expect(ids(await list('coordA'))).toEqual(['a1', 'a2', 'a3', 'a4']);
      expect(ids(await list('coordB'))).toEqual(['b1']);
      expect(ids(await list('tutorA1'))).toEqual(['a1', 'a2']);
      expect(ids(await list('tutorB'))).toEqual(['b1']);
    });

    it('vicerrectorado, profesional, tutorado y cuenta desactivada no ven ninguno', async () => {
      for (const who of ['vice', 'prof', 'pupil', 'gone']) expect(await list(who)).toEqual([]);
    });

    it('los filtros del cliente nunca amplían el alcance', async () => {
      // El tutor pide otra escuela o a otro tutor: sigue viendo solo lo suyo.
      expect(ids(await list('tutorA1', { schoolId: 'B' }))).toEqual([]);
      expect(ids(await list('tutorA1', { tutorId: 'tutorB' }))).toEqual(['a1', 'a2']);
      // El coordinador pide la escuela vecina.
      expect(await list('coordA', { schoolId: 'B' })).toEqual([]);
    });

    it('"sin tutor" no deja a un tutor ver estudiantes que no son suyos', async () => {
      expect(await list('tutorA1', { unassigned: true })).toEqual([]);
    });

    it('el coordinador sí ve los de su escuela sin tutor (para asignarlos)', async () => {
      expect(ids(await list('coordA', { unassigned: true }))).toEqual(['a4']);
    });
  });

  describe('alta, edición, riesgo e importación', () => {
    const create = (who: string, schoolId: string) =>
      new CreateStudentUseCase(w.students, w.schools, w.guard).execute(
        { studentCode: '12345678', firstName: 'N', lastName: 'A', cycle: 1, schoolId } as never,
        who,
      );

    it('el coordinador da de alta solo en sus escuelas; la DBU, en cualquiera', async () => {
      w.students.findByCode.mockResolvedValue(null);
      w.students.create.mockImplementation(async (d) => ({ id: 'n', ...d }) as never);
      await expect(create('coordA', 'A')).resolves.toBeDefined();
      await expect(create('dbu', 'B')).resolves.toBeDefined();
      await expect(create('coordA', 'B')).rejects.toBeInstanceOf(StudentAccessDeniedError);
      expect(w.students.create).toHaveBeenCalledTimes(2);
    });

    it('un tutor no da de alta a nadie, ni en la escuela donde tiene tutorados', async () => {
      await expect(create('tutorA1', 'A')).rejects.toBeInstanceOf(StudentAccessDeniedError);
    });

    it('editar: solo con alcance, y mover a otra escuela exige alcance también sobre la de destino', async () => {
      const update = (who: string, id: string, data: object) =>
        new UpdateStudentUseCase(w.students, w.schools, w.guard).execute(id, data as never, who);
      await expect(update('coordA', 'a1', { firstName: 'Nuevo' })).resolves.toBeDefined();
      await expect(update('coordA', 'b1', { firstName: 'Nuevo' })).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(update('coordA', 'a1', { schoolId: 'B' })).rejects.toBeInstanceOf(StudentAccessDeniedError);
      expect(w.students.update).toHaveBeenCalledTimes(1);
    });

    it('marcar riesgo respeta el alcance', async () => {
      const mark = (who: string, id: string) =>
        new MarkStudentRiskUseCase(w.students, w.guard).execute(id, { isAtRisk: true, reason: 'x' }, who);
      await expect(mark('coordB', 'a1')).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(mark('coordA', 'a1')).resolves.toBeDefined();
    });

    it('importación: el coordinador no puede cargar tutorados de otra escuela', async () => {
      w.students.findByCode.mockResolvedValue(null);
      w.students.create.mockImplementation(async (d) => ({ id: 'n', ...d }) as never);
      const rows = [
        { rowNumber: 2, studentCode: '20200001', firstName: 'Ana', lastName: 'A', cycle: '2', school: 'Escuela A' },
        { rowNumber: 3, studentCode: '20200002', firstName: 'Beto', lastName: 'B', cycle: '2', school: 'Escuela B' },
      ];
      const report = await new ImportStudentsUseCase(w.students, w.schools, w.guard).execute(rows as never, 'coordA');

      expect(report.created).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].message).toMatch(/No tienes acceso a la escuela/);
      expect(w.students.create).toHaveBeenCalledTimes(1);

      const all = await new ImportStudentsUseCase(w.students, w.schools, w.guard).execute(rows as never, 'dbu');
      expect(all.created).toBe(2);
    });
  });

  describe('entrevistas, seguimientos y red de apoyo (datos personales sensibles)', () => {
    const interviewInput = { motiveAcademic: true, motivePersonalEmotional: false, motiveVocational: false, aspectsDiscussed: 'x', agreements: 'y' } as never;
    const followUpInput = { reason: 'r', agreements: 'a' } as never;
    const contactInput = { fullName: 'Madre', relationship: 'Madre', phone: '999' } as never;

    const interviews = () => ({ create: jest.fn(async (d) => d), findByStudent: jest.fn(async () => [{ id: 'i1' }]) }) as never;
    const followUps = () => ({ create: jest.fn(async (d) => d), findByStudent: jest.fn(async () => [{ id: 'f1' }]) }) as never;
    const contacts = () => ({ upsert: jest.fn(async (_id, d) => d), findByStudent: jest.fn(async () => ({ fullName: 'Madre' })) }) as never;

    it('el tutor escribe y lee solo sobre sus tutorados; otro tutor recibe 404', async () => {
      const repoI = interviews();
      const create = new CreateInterviewUseCase(repoI, w.guard);
      const list = new ListInterviewsByStudentUseCase(repoI, w.guard);

      await expect(create.execute('a1', 'tutorA1', interviewInput)).resolves.toBeDefined();
      await expect(list.execute('a1', 'tutorA1')).resolves.toHaveLength(1);

      await expect(create.execute('a1', 'tutorA2', interviewInput)).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(create.execute('b1', 'tutorA1', interviewInput)).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(list.execute('a1', 'tutorB')).rejects.toBeInstanceOf(StudentNotFoundError);
      expect((repoI as { create: jest.Mock }).create).toHaveBeenCalledTimes(1);
    });

    it('seguimientos: igual', async () => {
      const repoF = followUps();
      const create = new CreateFollowUpUseCase(repoF, w.guard);
      const list = new ListFollowUpsByStudentUseCase(repoF, w.guard);

      await expect(create.execute('a3', 'tutorA2', followUpInput)).resolves.toBeDefined();
      await expect(create.execute('a3', 'tutorA1', followUpInput)).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(list.execute('a3', 'tutorA1')).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(list.execute('a3', 'coordA')).resolves.toHaveLength(1); // su coordinador sí
      await expect(list.execute('a3', 'coordB')).rejects.toBeInstanceOf(StudentNotFoundError);
    });

    it('red de apoyo: el vicerrectorado y el tutorado no acceden aunque tengan el ID', async () => {
      const repoC = contacts();
      const get = new GetSupportContactUseCase(repoC, w.guard);
      const upsert = new UpsertSupportContactUseCase(repoC, w.guard);

      await expect(get.execute('a1', 'tutorA1')).resolves.toBeDefined();
      for (const who of ['vice', 'pupil', 'prof', 'tutorB', 'gone']) {
        await expect(get.execute('a1', who)).rejects.toBeInstanceOf(StudentNotFoundError);
        await expect(upsert.execute('a1', contactInput, who)).rejects.toBeInstanceOf(StudentNotFoundError);
      }
      expect((repoC as { upsert: jest.Mock }).upsert).not.toHaveBeenCalled();
    });

    it('el expediente completo respeta el alcance antes de leer nada', async () => {
      const empty = { findByStudent: jest.fn(async () => []) };
      const record = new GetStudentRecordUseCase(
        w.students, w.schools, w.users, w.roles,
        empty as never, empty as never, { findByStudent: jest.fn(async () => null) } as never,
        empty as never, empty as never, { findMany: jest.fn(async () => []) } as never, w.guard,
        empty as never,
      );
      await expect(record.execute('a1', false, 'tutorA2')).rejects.toBeInstanceOf(StudentNotFoundError);
      expect(empty.findByStudent).not.toHaveBeenCalled(); // no se tocó ningún dato del tutorado
      await expect(record.execute('a1', false, 'tutorA1')).resolves.toMatchObject({ student: { id: 'a1' } });
    });
  });

  describe('sesiones', () => {
    const sessionsRepo = (all = [session('s-a1', 'tutorA1', ['a1']), session('s-a3', 'tutorA2', ['a3']), session('s-b1', 'tutorB', ['b1']), session('s-g', 'tutorA1', ['a1', 'a2'])]) =>
      ({
        findAll: jest.fn(async (f?: { tutorId?: string; studentId?: string }) =>
          all.filter((s) => (!f?.tutorId || s.tutorId === f.tutorId) && (!f?.studentId || s.studentIds.includes(f.studentId))),
        ),
        findById: jest.fn(async (id: string) => all.find((s) => s.id === id) ?? null),
        findOverlapping: jest.fn(async () => []),
        create: jest.fn(async (d, studentIds) => ({ id: 'new', ...d, studentIds })),
        listEvidenceBySession: jest.fn(async () => []),
        findEvidenceById: jest.fn(async () => ({ id: 'e1', sessionId: 's-a1', storageKey: 'k', fileName: 'f.pdf' })),
      }) as never;

    it('programar: un tutor solo con sus tutorados (también en sesiones grupales)', async () => {
      const repo = sessionsRepo();
      const params = { findByKey: jest.fn(async () => null) } as never;
      const schedule = (who: string, studentIds: string[]) =>
        new ScheduleSessionUseCase(repo, w.guard, params).execute(who, {
          studentIds, topic: 't', scheduledAt: '2026-11-01T10:00:00Z', modality: 'VIRTUAL', meetingLink: 'https://x',
        } as never);

      await expect(schedule('tutorA1', ['a1', 'a2'])).resolves.toBeDefined();
      await expect(schedule('tutorA1', ['a1', 'a3'])).rejects.toBeInstanceOf(StudentNotFoundError); // uno ajeno basta
      await expect(schedule('tutorA1', ['b1'])).rejects.toBeInstanceOf(StudentNotFoundError);
      expect((repo as { create: jest.Mock }).create).toHaveBeenCalledTimes(1);
    });

    it('listar: el tutor solo ve las suyas aunque pida otro tutor o un estudiante ajeno', async () => {
      const list = (who: string, filters = {}) =>
        new ListSessionsUseCase(sessionsRepo(), w.guard, w.students, w.users, w.roles).execute(who, filters);

      expect(ids(await list('tutorA1'))).toEqual(['s-a1', 's-g']);
      expect(ids(await list('tutorA1', { tutorId: 'tutorB' }))).toEqual(['s-a1', 's-g']);
      expect(await list('tutorA1', { studentId: 'b1' })).toEqual([]);
      expect(ids(await list('dbu'))).toEqual(['s-a1', 's-a3', 's-b1', 's-g']);
      expect(ids(await list('coordA'))).toEqual(['s-a1', 's-a3', 's-g']); // las de su escuela, de cualquier tutor
      expect(ids(await list('coordB'))).toEqual(['s-b1']);
    });

    it('un tutorado ve su agenda sin los identificadores de sus compañeros; vicerrectorado y profesional, nada', async () => {
      w.students.findByUserId.mockImplementation(async (uid: string) => (uid === 'pupil' ? STUDENTS[0] : null));
      const list = (who: string, filters = {}) =>
        new ListSessionsUseCase(sessionsRepo(), w.guard, w.students, w.users, w.roles).execute(who, filters);

      const own = await list('pupil');
      expect(ids(own)).toEqual(['s-a1', 's-g']);
      expect(own.every((s) => s.studentIds.length === 1 && s.studentIds[0] === 'a1')).toBe(true); // a2 no se filtra
      expect(await list('pupil', { studentId: 'a3' })).toEqual([]);
      expect(await list('vice')).toEqual([]);
      expect(await list('prof')).toEqual([]);
      expect(await list('gone')).toEqual([]);
    });

    it('evidencias: solo el tutor de la sesión, su coordinador y la DBU; el tutorado y el vicerrectorado, 404', async () => {
      const repo = sessionsRepo();
      const list = new ListSessionEvidenceUseCase(repo, w.users, w.guard);
      const file = new GetSessionEvidenceFileUseCase(repo, { resolvePath: () => '/x', save: jest.fn(), delete: jest.fn() }, w.guard);

      for (const who of ['tutorA1', 'coordA', 'dbu']) {
        await expect(list.execute('s-a1', who)).resolves.toEqual([]);
        await expect(file.execute('s-a1', 'e1', who)).resolves.toBeDefined();
      }
      for (const who of ['tutorA2', 'tutorB', 'coordB', 'pupil', 'vice', 'prof', 'gone']) {
        await expect(list.execute('s-a1', who)).rejects.toBeInstanceOf(SessionNotFoundError);
        await expect(file.execute('s-a1', 'e1', who)).rejects.toBeInstanceOf(SessionNotFoundError);
      }
    });
  });

  describe('asignación y reasignación', () => {
    const assign = (who: string, studentIds: string[]) =>
      new AssignStudentsUseCase(w.students, w.users, w.roles, w.guard).execute({ tutorId: 'tutorA2', studentIds }, who);

    it('el coordinador asigna solo a quienes no tienen tutor y son de su escuela', async () => {
      await expect(assign('coordA', ['a4'])).resolves.toEqual({ assigned: 1 });
      expect(w.students.assignTutor).toHaveBeenCalledWith(['a4'], 'tutorA2', expect.any(Date));
    });

    it('no puede asignar a la escuela vecina ni sobrescribir un tutor existente', async () => {
      await expect(assign('coordA', ['a4', 'b1'])).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(assign('coordA', ['a4', 'a1'])).rejects.toBeInstanceOf(StudentsAlreadyAssignedError);
      expect(w.students.assignTutor).not.toHaveBeenCalled();
    });

    it('un tutor, el vicerrectorado o una cuenta desactivada no asignan a nadie', async () => {
      for (const who of ['tutorA1', 'vice', 'gone']) {
        await expect(assign(who, ['a4'])).rejects.toBeInstanceOf(StudentNotFoundError);
      }
    });

    it('reasignar: solo con alcance sobre el tutorado', async () => {
      const history = { create: jest.fn() } as never;
      const reassign = (who: string, id: string) =>
        new ReassignStudentUseCase(w.students, w.users, w.roles, history, w.guard).execute(id, who, { newTutorId: 'tutorA2', reason: 'cambio' });

      await expect(reassign('coordA', 'a1')).resolves.toBeDefined();
      await expect(reassign('coordB', 'a1')).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(reassign('tutorA1', 'a1')).resolves.toBeDefined(); // el tutor actual tiene alcance; la ruta exige students:write, que él no tiene
    });

    it('el tutor destino debe seguir siendo un Docente Tutor activo', async () => {
      await expect(
        new AssignStudentsUseCase(w.students, w.users, w.roles, w.guard).execute({ tutorId: 'gone', studentIds: ['a4'] }, 'dbu'),
      ).rejects.toBeInstanceOf(TutorNotFoundError);
    });
  });

  describe('solicitudes de tutoría y derivaciones', () => {
    const requestsRepo = () => {
      const all = [
        { id: 'r1', studentId: 'a1', routedToId: 'tutorA1' },
        { id: 'r2', studentId: 'a3', routedToId: 'tutorA2' },
        { id: 'r3', studentId: 'b1', routedToId: 'tutorB' },
        { id: 'r4', studentId: 'a4', routedToId: 'coordA' },
      ];
      return { create: jest.fn(async (d) => ({ id: 'n', ...d })), findAll: jest.fn(async () => all), findByStudent: jest.fn() } as never;
    };

    it('listar: cada quien ve las enrutadas a él o las de su alcance', async () => {
      const list = (who: string) => new ListTutoringRequestsUseCase(requestsRepo(), w.guard, w.students, w.users).execute(who);
      expect(ids(await list('dbu'))).toEqual(['r1', 'r2', 'r3', 'r4']);
      expect(ids(await list('tutorA1'))).toEqual(['r1']);
      expect(ids(await list('coordA'))).toEqual(['r1', 'r2', 'r4']);
      expect(ids(await list('coordB'))).toEqual(['r3']);
      for (const who of ['vice', 'pupil', 'prof', 'gone']) expect(await list(who)).toEqual([]);
    });

    it('registrar una solicitud: solo sobre tutorados del alcance', async () => {
      const create = (who: string, studentId: string) =>
        new CreateTutoringRequestUseCase(requestsRepo(), w.guard, w.schools, w.users, w.roles, { create: jest.fn() } as never).execute(studentId, who, {
          source: 'STUDENT', caseType: 'ACADEMIC', reason: 'x',
        } as never);

      await expect(create('tutorA1', 'a1')).resolves.toBeDefined();
      await expect(create('tutorA1', 'a3')).rejects.toBeInstanceOf(StudentNotFoundError);
      await expect(create('coordA', 'a4')).resolves.toBeDefined();
      await expect(create('coordA', 'b1')).rejects.toBeInstanceOf(StudentNotFoundError);
    });

    it('derivar: un tutor solo deriva a sus tutorados', async () => {
      const referrals = { create: jest.fn(async (d) => ({ id: 'ref', ...d })) } as never;
      const notifications = { create: jest.fn() } as never;
      w.users.findAll.mockResolvedValue([]); // sin profesionales a quienes avisar
      const refer = (who: string, studentId: string) =>
        new CreateReferralUseCase(referrals, w.guard, w.users, w.roles, notifications).execute(studentId, who, {
          checkedAspects: [], reason: 'x', service: 'PSICOLOGIA',
        } as never);

      await expect(refer('tutorA1', 'a1')).resolves.toBeDefined();
      await expect(refer('tutorA1', 'a3')).rejects.toBeInstanceOf(StudentNotFoundError);
      expect((referrals as { create: jest.Mock }).create).toHaveBeenCalledTimes(1);
    });
  });

  describe('alertas e informe de horarios', () => {
    const atRisk = () => {
      w.students.findAll.mockImplementation(async (f) =>
        STUDENTS.filter((s) => (!f?.tutorId || s.tutorId === f.tutorId)).map((s) => ({ ...s, isAtRisk: true })),
      );
    };

    it('las alertas se acotan al alcance, no a un parámetro del cliente', async () => {
      atRisk();
      const sessions = { findByStudent: jest.fn(async () => []) } as never;
      const params = { findByKey: jest.fn(async () => null) } as never;
      const alerts = new GetRiskAlertsUseCase(w.students, sessions, w.users, params, w.guard);

      const mine = async (who: string) => (await alerts.executeFor(who)).map((a) => a.studentId).sort();
      expect(await mine('tutorA1')).toEqual(['a1', 'a2']);
      expect(await mine('coordA')).toEqual(['a1', 'a2', 'a3', 'a4']);
      expect(await mine('dbu')).toEqual(['a1', 'a2', 'a3', 'a4', 'b1']);
      for (const who of ['vice', 'pupil', 'prof', 'gone']) expect(await mine(who)).toEqual([]);
    });

    it('informe de horarios: cada tutor consulta el suyo; el coordinador, el de tutores de su escuela; el vicerrectorado, ninguno', async () => {
      const sessions = { findAll: jest.fn(async () => []) } as never;
      const report = (who: string, tutorId: string) =>
        new GetScheduleAttendanceReportUseCase(w.users, w.roles, sessions, w.students, w.guard).execute({ requesterId: who, tutorId });

      await expect(report('tutorA1', 'tutorA1')).resolves.toBeDefined();
      await expect(report('tutorA1', 'tutorA2')).rejects.toBeInstanceOf(TutorNotFoundError);
      await expect(report('dbu', 'tutorB')).resolves.toBeDefined();
      await expect(report('coordA', 'tutorA2')).resolves.toBeDefined();
      await expect(report('coordA', 'tutorB')).rejects.toBeInstanceOf(TutorNotFoundError);
      for (const who of ['vice', 'pupil', 'prof', 'gone']) {
        await expect(report(who, 'tutorA1')).rejects.toBeInstanceOf(TutorNotFoundError);
      }
    });
  });
});
