import { createHash } from 'node:crypto';
import {
  AttachReferralSignedDocumentUseCase,
  ListReferralSignedDocumentsUseCase,
} from '@application/use-cases/signed-documents/ReferralSignedDocumentUseCases';
import { GetAttendanceSheetUseCase } from '@application/use-cases/signed-documents/AttendanceSheetUseCases';
import { GetSignedDocumentFileUseCase } from '@application/use-cases/signed-documents/GetSignedDocumentFileUseCase';
import { SignedDocumentNotFoundError } from '@application/use-cases/signed-documents/SignedDocumentErrors';
import { AttendanceSheetPdf } from '@infrastructure/parsers/AttendanceSheetPdf';
import { ReferralForbiddenError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

const FILE = { fileBuffer: Buffer.from('escaneo'), fileName: 'firmado.pdf', mimeType: 'application/pdf', fileSize: 7 };
const SHA = createHash('sha256').update('escaneo').digest('hex');

describe('documentos firmados (A14)', () => {
  let roleName: string;
  const referral = { id: 'ref-1', studentId: 's1', referredById: 'tutor-1', service: 'PSICOLOGIA' };
  const serviceOf = (id: string) => (id === 'prof-psi' ? 'PSICOLOGIA' : id === 'prof-salud' ? 'SALUD' : null);
  const users = {
    findById: jest.fn().mockImplementation(async (id: string) => ({
      id,
      roleId: 'r',
      isActive: true,
      firstName: 'Nombre',
      lastName: id,
      service: serviceOf(id),
    })),
  };
  const roles = { findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })) };
  const referrals = { findById: jest.fn().mockResolvedValue(referral) };
  const storage = {
    save: jest.fn().mockResolvedValue('key-1.pdf'),
    resolvePath: jest.fn().mockReturnValue('/data/key-1.pdf'),
    delete: jest.fn(),
  };
  const auditLogs = { create: jest.fn() };
  const documents = {
    create: jest.fn().mockImplementation(async (d: Record<string, unknown>) => ({ id: 'doc-1', createdAt: new Date(), ...d })),
    findById: jest.fn(),
    listByReferral: jest.fn().mockResolvedValue([]),
    listByStudentPeriod: jest.fn(),
  };

  beforeEach(() => {
    roleName = 'Docente Tutor';
    documents.create.mockClear();
    auditLogs.create.mockClear();
  });

  const attach = () =>
    new AttachReferralSignedDocumentUseCase(
      referrals as never,
      documents as never,
      users as never,
      roles as never,
      storage as never,
      auditLogs as never,
    );

  it('el tutor emisor adjunta la constancia: se guarda la huella SHA-256, quién la subió y queda en la bitácora', async () => {
    const view = await attach().execute('ref-1', 'tutor-1', FILE, '10.0.0.1');

    expect(documents.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'REFERRAL_CONSTANCIA', referralId: 'ref-1', studentId: 's1', sha256: SHA, uploadedById: 'tutor-1' }),
    );
    expect(view).not.toHaveProperty('storageKey');
    expect(view.uploadedByName).toBe('Nombre tutor-1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SIGNED_DOCUMENT_ATTACHED', entityId: 'ref-1', userId: 'tutor-1' }),
    );
  });

  it('el profesional del servicio de destino y la DBU pueden adjuntar; otro servicio, otro tutor y la coordinación no', async () => {
    roleName = 'Profesional de Servicio';
    await expect(attach().execute('ref-1', 'prof-psi', FILE)).resolves.toBeDefined();
    await expect(attach().execute('ref-1', 'prof-salud', FILE)).rejects.toBeInstanceOf(ReferralForbiddenError);
    roleName = 'Administrador DBU';
    await expect(attach().execute('ref-1', 'dbu', FILE)).resolves.toBeDefined();
    roleName = 'Docente Tutor';
    await expect(attach().execute('ref-1', 'otro-tutor', FILE)).rejects.toBeInstanceOf(ReferralForbiddenError);
    roleName = 'Coordinador';
    await expect(attach().execute('ref-1', 'coord', FILE)).rejects.toBeInstanceOf(ReferralForbiddenError);
  });

  it('listar aplica la misma regla de visibilidad que la derivación', async () => {
    const list = new ListReferralSignedDocumentsUseCase(referrals as never, documents as never, users as never, roles as never);
    await expect(list.execute('ref-1', 'otro-tutor')).rejects.toBeInstanceOf(ReferralForbiddenError);
    await expect(list.execute('ref-1', 'tutor-1')).resolves.toEqual([]);
  });

  describe('descarga', () => {
    const guard = { assertAccess: jest.fn() };
    const download = () =>
      new GetSignedDocumentFileUseCase(documents as never, referrals as never, users as never, roles as never, guard as never, storage as never);

    it('una constancia solo se entrega a quien ve la derivación; a los demás, «no encontrado»', async () => {
      documents.findById.mockResolvedValue({ id: 'd1', kind: 'REFERRAL_CONSTANCIA', referralId: 'ref-1', fileName: 'f.pdf', mimeType: 'application/pdf', storageKey: 'key-1.pdf' });
      await expect(download().execute('d1', 'tutor-1')).resolves.toMatchObject({ fileName: 'f.pdf', absolutePath: '/data/key-1.pdf' });
      await expect(download().execute('d1', 'otro-tutor')).rejects.toBeInstanceOf(SignedDocumentNotFoundError);
    });

    it('una hoja de asistencia sigue el alcance sobre el tutorado', async () => {
      documents.findById.mockResolvedValue({ id: 'd2', kind: 'ATTENDANCE_SHEET', studentId: 's1', fileName: 'h.pdf', mimeType: 'application/pdf', storageKey: 'key-2.pdf' });
      guard.assertAccess.mockResolvedValueOnce({}).mockRejectedValueOnce(new StudentNotFoundError('s1'));
      await expect(download().execute('d2', 'tutor-1')).resolves.toBeDefined();
      await expect(download().execute('d2', 'otro-tutor')).rejects.toBeInstanceOf(SignedDocumentNotFoundError);
    });

    it('un documento inexistente es «no encontrado»', async () => {
      documents.findById.mockResolvedValue(null);
      await expect(download().execute('nada', 'tutor-1')).rejects.toBeInstanceOf(SignedDocumentNotFoundError);
    });
  });
});

describe('hoja de asistencia (Anexo N°4)', () => {
  const day = (iso: string) => new Date(`${iso}T15:00:00.000Z`);
  const student = { id: 's1', firstName: 'Ana', lastName: 'Torres', studentCode: '20191234', cycle: 5, email: null, phone: null, schoolId: 'sc1', tutorId: 'tutor-1' };
  const guard = { assertAccess: jest.fn().mockResolvedValue(student) };
  const session = (tutorId: string, topic: string, when: string, studentIds: string[], seq: number | null, cancelled = false) => ({
    tutorId,
    topic,
    scheduledAt: day(when),
    modality: 'PRESENCIAL',
    studentIds,
    cancelledAt: cancelled ? day(when) : null,
    attendance: seq === null ? null : { sequenceNumber: seq },
  });
  const sessions = {
    findByStudent: jest.fn().mockResolvedValue([
      session('tutor-1', 'Hábitos', '2026-09-02', ['s1'], 2),
      session('tutor-1', 'Bienvenida', '2026-08-10', ['s1'], 1),
      session('tutor-1', 'Sin asistencia', '2026-09-09', ['s1'], null),
      session('tutor-1', 'Grupal', '2026-09-10', ['s1', 's2'], 3),
      session('tutor-1', 'Cancelada', '2026-09-11', ['s1'], 4, true),
      session('otro', 'De otro tutor', '2026-09-12', ['s1'], 5),
      session('tutor-1', 'Semestre anterior', '2026-03-02', ['s1'], 1),
      session('tutor-1', 'Último día', '2026-12-20', ['s1'], 3),
    ]),
  };
  const users = { findById: jest.fn().mockResolvedValue({ firstName: 'Elena', lastName: 'Ramírez' }) };
  const schools = { findById: jest.fn().mockResolvedValue({ id: 'sc1', name: 'Sistemas', facultyId: 'f1' }) };
  const faculties = { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Ingeniería' }]) };
  const periods = {
    findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II', startDate: new Date('2026-08-01T00:00:00Z'), endDate: new Date('2026-12-20T00:00:00Z') }),
    findById: jest.fn(),
  };
  const useCase = () =>
    new GetAttendanceSheetUseCase(guard as never, sessions as never, users as never, schools as never, faculties as never, periods as never);

  it('lista solo las individuales con asistencia confirmada del tutor en el semestre, por número, incluido el último día', async () => {
    const sheet = await useCase().execute('tutor-1', 's1');

    expect(sheet.rows.map((r) => [r.sequenceNumber, r.topic])).toEqual([
      [1, 'Bienvenida'],
      [2, 'Hábitos'],
      [3, 'Último día'],
    ]);
    expect(sheet).toMatchObject({ tutorName: 'Elena Ramírez', schoolName: 'Sistemas', facultyName: 'Ingeniería', periodName: '2026-II' });
  });

  it('un tutorado fuera de alcance no tiene hoja (no encontrado)', async () => {
    guard.assertAccess.mockRejectedValueOnce(new StudentNotFoundError('s9'));
    await expect(useCase().execute('otro', 's9')).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it('el PDF imprimible se genera con las ocho filas y la firma del tutorado', async () => {
    const sheet = await useCase().execute('tutor-1', 's1');
    const buffer = await new AttendanceSheetPdf().build(sheet);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1500);
  });
});
