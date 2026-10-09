import { UpdateTutoringRequestStatusUseCase } from '@application/use-cases/tutoring-requests/UpdateTutoringRequestStatusUseCase';
import { ListOwnTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';
import {
  InvalidTutoringRequestStatusError,
  TutoringRequestNotFoundError,
} from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { TutoringRequest } from '@domain/entities/TutoringRequest';

const base: TutoringRequest = {
  id: 'r1',
  studentId: 's1',
  requestedById: 'student-user',
  source: 'STUDENT',
  caseType: 'ACADEMIC',
  reason: 'Necesito apoyo en Cálculo',
  routedToId: 'tutor-1',
  routedToRole: 'tutor',
  status: 'PENDIENTE',
  responseNote: null,
  handledById: null,
  handledAt: null,
  sessionId: null,
  createdAt: new Date('2026-10-01T10:00:00Z'),
};

describe('seguimiento de solicitudes de tutoría (R01)', () => {
  let current: TutoringRequest;
  let allowed: boolean;
  const requests = {
    findById: jest.fn(),
    updateAttention: jest.fn(),
    findByStudent: jest.fn(),
  };
  const guard = { scopeFor: jest.fn(), assertAccess: jest.fn() };
  const students = {
    findById: jest.fn().mockResolvedValue({ id: 's1', firstName: 'Ana', lastName: 'Torres', studentCode: '20191234', userId: 'student-user' }),
    findByUserId: jest.fn(),
  };
  const users = {
    findById: jest.fn().mockImplementation(async (id: string) => ({ id, firstName: 'Nombre', lastName: id })),
  };
  const sessions = { findById: jest.fn() };
  const notifications = { create: jest.fn() };
  const auditLogs = { create: jest.fn() };

  const useCase = () =>
    new UpdateTutoringRequestStatusUseCase(
      requests as never,
      guard as never,
      students as never,
      users as never,
      sessions as never,
      notifications as never,
      auditLogs as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    current = { ...base };
    allowed = true;
    requests.findById.mockImplementation(async () => current);
    requests.updateAttention.mockImplementation(async (_id: string, _expected: string, attention: object) => ({ ...current, ...attention }));
    // El destinatario siempre tiene acceso; los demás dependen de `allowed` (alcance sobre el tutorado).
    guard.scopeFor.mockResolvedValue({ kind: 'TUTOR', tutorId: 'tutor-1' });
    guard.assertAccess.mockImplementation(async () => {
      if (!allowed) throw new Error('fuera de alcance');
      return {};
    });
  });

  it('el destinatario la pasa a «en atención»: queda quién y cuándo, en la bitácora, y el estudiante recibe un aviso', async () => {
    const view = await useCase().execute('tutor-1', 'r1', { status: 'EN_ATENCION' }, '10.0.0.1');

    expect(requests.updateAttention).toHaveBeenCalledWith(
      'r1',
      'PENDIENTE',
      expect.objectContaining({ status: 'EN_ATENCION', handledById: 'tutor-1', handledAt: expect.any(Date) }),
    );
    expect(view.studentName).toBe('Ana Torres');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TUTORING_REQUEST_STATUS', entityId: 'r1', details: 'PENDIENTE → EN_ATENCION', userId: 'tutor-1' }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'student-user', type: 'TUTORING_REQUEST_UPDATED', tutoringRequestId: 'r1' }),
    );
  });

  it('atenderla exige la respuesta para el estudiante y la guarda', async () => {
    await expect(useCase().execute('tutor-1', 'r1', { status: 'ATENDIDA' })).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
    await expect(useCase().execute('tutor-1', 'r1', { status: 'ATENDIDA', note: '   ' })).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);

    const view = await useCase().execute('tutor-1', 'r1', { status: 'ATENDIDA', note: 'Te espero el jueves a las 10:00.' });
    expect(view.responseNote).toBe('Te espero el jueves a las 10:00.');
    expect(view.status).toBe('ATENDIDA');
  });

  it('el estado solo avanza: no retrocede ni se repite', async () => {
    current = { ...base, status: 'ATENDIDA', responseNote: 'ok' };
    await expect(useCase().execute('tutor-1', 'r1', { status: 'EN_ATENCION' })).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
    current = { ...base, status: 'EN_ATENCION' };
    await expect(useCase().execute('tutor-1', 'r1', { status: 'EN_ATENCION' })).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
  });

  it('quien no es el destinatario ni tiene alcance sobre el tutorado la ve como inexistente', async () => {
    allowed = false;
    guard.scopeFor.mockResolvedValue({ kind: 'TUTOR', tutorId: 'otro-tutor' });
    await expect(useCase().execute('otro-tutor', 'r1', { status: 'EN_ATENCION' })).rejects.toBeInstanceOf(TutoringRequestNotFoundError);

    guard.scopeFor.mockResolvedValue({ kind: 'NONE' });
    await expect(useCase().execute('student-user', 'r1', { status: 'EN_ATENCION' })).rejects.toBeInstanceOf(TutoringRequestNotFoundError);
    expect(requests.updateAttention).not.toHaveBeenCalled();
  });

  it('la DBU puede atenderla aunque no sea la destinataria', async () => {
    guard.scopeFor.mockResolvedValue({ kind: 'ALL' });
    await expect(useCase().execute('dbu', 'r1', { status: 'EN_ATENCION' })).resolves.toBeDefined();
  });

  it('la sesión vinculada debe incluir al estudiante de la solicitud', async () => {
    sessions.findById.mockResolvedValueOnce({ id: 'ses-1', studentIds: ['otro'] }).mockResolvedValueOnce({ id: 'ses-2', studentIds: ['s1'] });
    await expect(useCase().execute('tutor-1', 'r1', { status: 'ATENDIDA', note: 'Atendida', sessionId: 'ses-1' })).rejects.toBeInstanceOf(
      InvalidTutoringRequestStatusError,
    );
    await useCase().execute('tutor-1', 'r1', { status: 'ATENDIDA', note: 'Atendida', sessionId: 'ses-2' });
    expect(requests.updateAttention).toHaveBeenCalledWith('r1', 'PENDIENTE', expect.objectContaining({ sessionId: 'ses-2' }));
  });

  it('si otra persona se adelantó en el cambio, informa el conflicto sin pisarlo', async () => {
    requests.updateAttention.mockResolvedValueOnce(null);
    await expect(useCase().execute('tutor-1', 'r1', { status: 'EN_ATENCION' })).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  describe('historial propio del tutorado', () => {
    it('devuelve solo las suyas, con su estado y la respuesta', async () => {
      students.findByUserId.mockResolvedValue({ id: 's1', firstName: 'Ana', lastName: 'Torres', studentCode: '20191234' });
      requests.findByStudent.mockResolvedValue([{ ...base, status: 'ATENDIDA', responseNote: 'Listo', handledById: 'tutor-1' }]);
      const own = new ListOwnTutoringRequestsUseCase(requests as never, students as never, users as never);

      const list = await own.execute('student-user');

      expect(requests.findByStudent).toHaveBeenCalledWith('s1');
      expect(list[0]).toMatchObject({ status: 'ATENDIDA', responseNote: 'Listo', handledByName: 'Nombre tutor-1', studentName: 'Ana Torres' });
    });

    it('una cuenta sin registro de estudiante no tiene historial', async () => {
      students.findByUserId.mockResolvedValue(null);
      const own = new ListOwnTutoringRequestsUseCase(requests as never, students as never, users as never);
      await expect(own.execute('sin-vinculo')).resolves.toEqual([]);
    });
  });
});
