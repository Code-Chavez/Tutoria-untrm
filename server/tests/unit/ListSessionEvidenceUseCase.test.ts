import { ListSessionEvidenceUseCase } from '@application/use-cases/sessions/ListSessionEvidenceUseCase';
import { SessionNotFoundError } from '@application/use-cases/sessions/SessionErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SessionEvidence, SessionWithParticipants } from '@domain/entities/Session';
import { User } from '@domain/entities/User';

describe('ListSessionEvidenceUseCase', () => {
  let useCase: ListSessionEvidenceUseCase;
  let sessions: jest.Mocked<SessionRepository>;
  let users: jest.Mocked<UserRepository>;

  const baseSession = { id: 'session-1', tutorId: 'tutor-1' } as SessionWithParticipants;

  const tutor = { id: 'tutor-1', firstName: 'Elena', lastName: 'Ramírez' } as User;

  const evidence: SessionEvidence = {
    id: 'evidence-1',
    sessionId: 'session-1',
    fileName: 'evidencia.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    storageKey: 'key-1.pdf',
    uploadedById: 'tutor-1',
    createdAt: new Date(),
  };

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(baseSession),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
      countAttendanceByTutorAndStudent: jest.fn(),
      createAttendance: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn().mockResolvedValue([evidence]),
      findEvidenceById: jest.fn(),
    };
    users = {
      findById: jest.fn().mockResolvedValue(tutor),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new ListSessionEvidenceUseCase(sessions, users);
  });

  it('devuelve las evidencias con el nombre de quien las subió', async () => {
    const result = await useCase.execute('session-1');

    expect(result).toEqual([{ ...evidence, uploadedByName: 'Elena Ramírez' }]);
  });

  it('usa «Desconocido» si el usuario que subió la evidencia ya no existe', async () => {
    users.findById.mockResolvedValue(null);

    const result = await useCase.execute('session-1');

    expect(result[0].uploadedByName).toBe('Desconocido');
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(SessionNotFoundError);
  });
});
