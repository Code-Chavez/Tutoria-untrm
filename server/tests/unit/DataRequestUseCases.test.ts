import {
  DataRequestNotFoundError,
  InvalidDataRequestError,
  ListDataRequestsUseCase,
  MarkDataRequestReceivedUseCase,
  NoPeriodToRequestError,
  RequestEmailNotConfiguredError,
  SendDataRequestUseCase,
  SetSchoolRequestEmailUseCase,
  TeacherListForbiddenError,
} from '@application/use-cases/data-requests/DataRequestUseCases';
import { buildDataRequestEmail } from '@application/services/dataRequestEmail';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { DataRequest } from '@domain/repositories/DataRequestRepository';
import { SchoolContactRepository } from '@domain/repositories/SchoolContactRepository';
import { Mailer, MailNotConfiguredError } from '@application/ports/Mailer';
import { InMemoryDataRequests } from '../helpers/inMemoryDataRequests';
import { StudentTemplateProvider } from '@application/ports/StudentTemplateProvider';

const school = { cycleCount: 10, id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, createdAt: new Date('2026-01-01'), requestEmail: 'registros@untrm.edu.pe' };
const requester = { id: 'u1', email: 'rosa@untrm.edu.pe', firstName: 'Rosa', lastName: 'Mendoza' };

describe('pedido de listas por correo (fase 2)', () => {
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'assertSchoolAccess' | 'scopeFor'>>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let faculties: jest.Mocked<FacultyRepository>;
  let users: jest.Mocked<UserRepository>;
  let mailer: jest.Mocked<Mailer>;
  let template: jest.Mocked<StudentTemplateProvider>;
  let requests: InMemoryDataRequests;
  let contacts: jest.Mocked<SchoolContactRepository>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    guard = { assertSchoolAccess: jest.fn().mockResolvedValue(undefined), scopeFor: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }), findAll: jest.fn().mockResolvedValue([{ id: 'p1', name: '2026-II' }]) } as unknown as jest.Mocked<AcademicPeriodRepository>;
    schools = { findById: jest.fn().mockResolvedValue(school), findAll: jest.fn().mockResolvedValue([school]) } as unknown as jest.Mocked<SchoolRepository>;
    faculties = { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Ingeniería' }]) } as unknown as jest.Mocked<FacultyRepository>;
    users = { findById: jest.fn().mockResolvedValue(requester) } as unknown as jest.Mocked<UserRepository>;
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    template = { build: jest.fn().mockResolvedValue(Buffer.from('xlsx')) };
    requests = new InMemoryDataRequests();
    contacts = { setRequestEmail: jest.fn().mockResolvedValue(undefined) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
  });

  const send = () => new SendDataRequestUseCase(guard as unknown as StudentAccessGuard, periods, schools, faculties, users, mailer, template, requests, audit);

  describe('enviar el pedido', () => {
    it('rechaza un ciclo ajeno al plan de la escuela antes de enviar correo', async () => {
      await expect(send().execute('u1', { schoolId: 's1', cycles: [11] })).rejects.toBeInstanceOf(InvalidDataRequestError);
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('permite pedir el ciclo 12 cuando la escuela tiene doce ciclos', async () => {
      schools.findById.mockResolvedValue({ ...school, cycleCount: 12 });
      await send().execute('u1', { schoolId: 's1', cycles: [12] });
      expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('ciclos 12') }));
    });
    it('envía un correo formal al correo configurado de la escuela, con copia y respuesta a quien pide, y la plantilla adjunta', async () => {
      const { request: result, replayed } = await send().execute('u1', { schoolId: 's1', cycles: [3, 1, 3], note: 'Con urgencia' });
      expect(replayed).toBe(false);

      const mail = mailer.send.mock.calls[0][0];
      expect(mail).toMatchObject({ to: 'registros@untrm.edu.pe', cc: 'rosa@untrm.edu.pe', replyTo: 'rosa@untrm.edu.pe' });
      expect(mail.subject).toBe('Solicitud de lista de estudiantes — Ingeniería de Sistemas — periodo 2026-II');
      expect(mail.text).toContain('ciclos 1, 3');
      expect(mail.text).toContain('Observaciones: Con urgencia');
      expect(mail.attachments?.[0]).toMatchObject({ filename: 'plantilla-estudiantes.xlsx' });
      expect(result).toMatchObject({ status: 'ENVIADO', toEmail: 'registros@untrm.edu.pe', cycles: [1, 3] });
    });

    it('sin ciclos pide todos; el correo no lleva datos de estudiantes', async () => {
      await send().execute('u1', { schoolId: 's1' });

      const mail = mailer.send.mock.calls[0][0];
      expect(mail.text).toContain('de todos los ciclos');
      expect(mail.text).toContain('código universitario, nombres, apellidos, correo institucional');
      expect(mail.text).toContain('Ley N.° 29733');
    });

    it('sin correo configurado para la escuela se rechaza y se indica configurarlo (no se envía nada)', async () => {
      schools.findById.mockResolvedValue({ ...school, requestEmail: null });

      await expect(send().execute('u1', { schoolId: 's1' })).rejects.toBeInstanceOf(RequestEmailNotConfiguredError);

      expect(mailer.send).not.toHaveBeenCalled();
      expect(requests.rows).toHaveLength(0);
    });

    it('si se demuestra que el correo no fue aceptado, el pedido queda registrado como FALLIDO para poder reenviarlo', async () => {
      mailer.send.mockRejectedValue(new MailNotConfiguredError());

      const { request: result } = await send().execute('u1', { schoolId: 's1' });

      expect(result).toMatchObject({ status: 'FALLIDO', error: 'MailNotConfiguredError' });
      expect(audit.create.mock.calls[0][0].details).toMatch(/no enviado/);
    });

    it('respeta el alcance: quien no coordina la escuela no pide', async () => {
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());

      await expect(send().execute('u2', { schoolId: 's1' })).rejects.toBeInstanceOf(StudentAccessDeniedError);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('sin periodo vigente no hay para qué periodo pedir', async () => {
      periods.findActive.mockResolvedValue(null);

      await expect(send().execute('u1', { schoolId: 's1' })).rejects.toBeInstanceOf(NoPeriodToRequestError);
    });

    it.each([[[0]], [[15]], [[2.5]]])('rechaza ciclos fuera de 1–14 o no enteros (%j)', async (cycles) => {
      await expect(send().execute('u1', { schoolId: 's1', cycles })).rejects.toBeInstanceOf(InvalidDataRequestError);
    });

    it('limita las observaciones a 500 caracteres', async () => {
      await expect(send().execute('u1', { schoolId: 's1', note: 'x'.repeat(501) })).rejects.toBeInstanceOf(InvalidDataRequestError);
    });
  });

  describe('pedir la lista de docentes tutores', () => {
    let teacherTemplate: jest.Mocked<StudentTemplateProvider>;
    const sendTeachers = () =>
      new SendDataRequestUseCase(guard as unknown as StudentAccessGuard, periods, schools, faculties, users, mailer, template, requests, audit, teacherTemplate);

    beforeEach(() => {
      teacherTemplate = { build: jest.fn().mockResolvedValue(Buffer.from('docentes')) };
    });

    it('la DBU lo pide con la plantilla de docentes, el texto de docentes y el pedido queda registrado como tal', async () => {
      const { request: result } = await sendTeachers().execute('u1', { schoolId: 's1', kind: 'DOCENTES' });

      const mail = mailer.send.mock.calls[0][0];
      expect(mail.subject).toBe('Solicitud de lista de docentes tutores — Ingeniería de Sistemas — periodo 2026-II');
      expect(mail.text).toContain('docentes que podrían ejercer la tutoría');
      expect(mail.text).toContain('una fila por docente): nombres, apellidos, correo institucional');
      expect(mail.attachments?.[0]).toMatchObject({ filename: 'plantilla-docentes-tutores.xlsx' });
      expect(template.build).not.toHaveBeenCalled();
      expect(result).toMatchObject({ kind: 'DOCENTES', status: 'ENVIADO' });
      expect(audit.create.mock.calls[0][0].details).toMatch(/lista de docentes/);
    });

    it('la coordinación no pide la lista de docentes (solo la DBU crea cuentas) y no se envía nada', async () => {
      guard.scopeFor.mockResolvedValue({ kind: 'SCHOOLS', schoolIds: ['s1'] });

      await expect(sendTeachers().execute('u1', { schoolId: 's1', kind: 'DOCENTES' })).rejects.toBeInstanceOf(TeacherListForbiddenError);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('sin plantilla de docentes configurada solo se puede pedir la de estudiantes; por omisión es la de estudiantes', async () => {
      await expect(send().execute('u1', { schoolId: 's1', kind: 'DOCENTES' })).rejects.toBeInstanceOf(InvalidDataRequestError);

      const { request: result } = await send().execute('u1', { schoolId: 's1' });
      expect(result.kind).toBe('ESTUDIANTES');
    });
  });

  describe('configurar el correo de pedido de una escuela', () => {
    const set = () => new SetSchoolRequestEmailUseCase(guard as unknown as StudentAccessGuard, schools, contacts, audit);

    it('guarda el correo normalizado y deja constancia sin repetir el correo en la bitácora', async () => {
      const saved = await set().execute('u1', 's1', '  Registros@UNTRM.edu.pe ');

      expect(saved).toBe('registros@untrm.edu.pe');
      expect(contacts.setRequestEmail).toHaveBeenCalledWith('s1', 'registros@untrm.edu.pe');
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'SCHOOL_REQUEST_EMAIL_SET', entityId: 's1' });
      expect(JSON.stringify(audit.create.mock.calls[0][0])).not.toContain('registros@');
    });

    it('un correo vacío lo quita', async () => {
      expect(await set().execute('u1', 's1', '')).toBeNull();
      expect(await set().execute('u1', 's1', null)).toBeNull();

      expect(contacts.setRequestEmail).toHaveBeenLastCalledWith('s1', null);
    });

    it('rechaza un correo mal formado', async () => {
      await expect(set().execute('u1', 's1', 'sin-arroba')).rejects.toBeInstanceOf(InvalidDataRequestError);

      expect(contacts.setRequestEmail).not.toHaveBeenCalled();
    });

    it('solo quien tiene alcance sobre la escuela lo configura', async () => {
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());

      await expect(set().execute('tutor', 's1', 'a@untrm.edu.pe')).rejects.toBeInstanceOf(StudentAccessDeniedError);
    });
  });

  describe('listar y marcar como recibido', () => {
    const row = { id: 'r1', schoolId: 's1', periodId: 'p1' } as DataRequest;

    it('la DBU ve todos; la coordinación, solo los de sus escuelas; los demás, ninguno', async () => {
      const listSpy = jest.spyOn(requests, 'list').mockResolvedValue([row]);
      const list = () => new ListDataRequestsUseCase(guard as unknown as StudentAccessGuard, schools, periods, requests);

      expect((await list().execute('admin'))[0]).toMatchObject({ schoolName: 'Ingeniería de Sistemas', periodName: '2026-II' });
      expect(listSpy).toHaveBeenLastCalledWith(undefined);

      guard.scopeFor.mockResolvedValue({ kind: 'SCHOOLS', schoolIds: ['s1'] });
      await list().execute('coord');
      expect(listSpy).toHaveBeenLastCalledWith({ schoolIds: ['s1'] });

      guard.scopeFor.mockResolvedValue({ kind: 'TUTOR', tutorId: 't' });
      expect(await list().execute('tutor')).toEqual([]);
    });

    it('marca como recibido comprobando el alcance sobre la escuela del pedido', async () => {
      jest.spyOn(requests, 'findById').mockResolvedValue(row);
      const markSpy = jest.spyOn(requests, 'markReceived').mockResolvedValue({ ...row, receivedAt: new Date() });
      const mark = new MarkDataRequestReceivedUseCase(guard as unknown as StudentAccessGuard, requests);

      await mark.execute('coord', 'r1');

      expect(guard.assertSchoolAccess).toHaveBeenCalledWith('coord', 's1');
      expect(markSpy).toHaveBeenCalledWith('r1', 'coord', expect.any(Date));
    });

    it('un pedido que no existe responde no encontrado', async () => {
      jest.spyOn(requests, 'findById').mockResolvedValue(null);

      await expect(new MarkDataRequestReceivedUseCase(guard as unknown as StudentAccessGuard, requests).execute('coord', 'x')).rejects.toBeInstanceOf(DataRequestNotFoundError);
    });
  });
});

describe('buildDataRequestEmail', () => {
  const mail = buildDataRequestEmail({ toEmail: 'a@untrm.edu.pe', requester, school: 'Sistemas', faculty: 'Ingeniería', period: '2026-II', cycles: [], note: '<b>x</b>', attachment: Buffer.from('x') });

  it('escapa las observaciones en el HTML', () => {
    expect(mail.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>x</b>');
  });

  it('es formal: saludo, firma de la Dirección y aviso de uso de los datos', () => {
    expect(mail.text).toContain('Estimado(a):');
    expect(mail.text).toContain('Atentamente,');
    expect(mail.text).toContain('Dirección de Bienestar Universitario');
  });
});
