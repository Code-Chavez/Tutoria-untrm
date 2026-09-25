import { GetSessionEvidenceFileUseCase } from '@application/use-cases/sessions/GetSessionEvidenceFileUseCase';
import {
  SessionNotFoundError,
  SessionEvidenceNotFoundError,
} from '@application/use-cases/sessions/SessionErrors';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SessionEvidence, SessionWithParticipants } from '@domain/entities/Session';

describe('GetSessionEvidenceFileUseCase', () => {
  let useCase: GetSessionEvidenceFileUseCase;
  let sessions: jest.Mocked<SessionRepository>;
  let storage: jest.Mocked<EvidenceStorage>;

  const baseSession = { id: 'session-1', tutorId: 'tutor-1' } as SessionWithParticipants;

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
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn().mockResolvedValue(evidence),
    };
    storage = {
      save: jest.fn(),
      resolvePath: jest.fn().mockReturnValue('/data/storage/evidence/key-1.pdf'),
    };
    useCase = new GetSessionEvidenceFileUseCase(sessions, storage);
  });

  it('devuelve la evidencia y la ruta absoluta del archivo', async () => {
    const result = await useCase.execute('session-1', 'evidence-1');

    expect(storage.resolvePath).toHaveBeenCalledWith('key-1.pdf');
    expect(result).toEqual({ evidence, absolutePath: '/data/storage/evidence/key-1.pdf' });
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'evidence-1')).rejects.toThrow(SessionNotFoundError);
  });

  it('lanza SessionEvidenceNotFoundError si la evidencia no existe', async () => {
    sessions.findEvidenceById.mockResolvedValue(null);
    await expect(useCase.execute('session-1', 'missing')).rejects.toThrow(
      SessionEvidenceNotFoundError,
    );
  });

  it('lanza SessionEvidenceNotFoundError si la evidencia pertenece a otra sesión', async () => {
    sessions.findEvidenceById.mockResolvedValue({ ...evidence, sessionId: 'other-session' });
    await expect(useCase.execute('session-1', 'evidence-1')).rejects.toThrow(
      SessionEvidenceNotFoundError,
    );
  });
});
