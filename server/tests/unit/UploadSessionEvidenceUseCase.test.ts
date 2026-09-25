import { UploadSessionEvidenceUseCase } from '@application/use-cases/sessions/UploadSessionEvidenceUseCase';
import { SessionNotFoundError, NotSessionTutorError } from '@application/use-cases/sessions/SessionErrors';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SessionWithParticipants } from '@domain/entities/Session';

describe('UploadSessionEvidenceUseCase', () => {
  let useCase: UploadSessionEvidenceUseCase;
  let sessions: jest.Mocked<SessionRepository>;
  let storage: jest.Mocked<EvidenceStorage>;

  const baseSession = {
    id: 'session-1',
    tutorId: 'tutor-1',
    topic: 'Reforzamiento',
    scheduledAt: new Date(),
    durationMinutes: 45,
    endsAt: new Date(),
    modality: 'PRESENCIAL',
    location: 'Oficina 204',
    meetingLink: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    studentIds: ['student-1'],
    attendance: null,
  } as SessionWithParticipants;

  const file = {
    fileBuffer: Buffer.from('contenido'),
    fileName: 'evidencia.pdf',
    mimeType: 'application/pdf',
    fileSize: 9,
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
      createEvidence: jest.fn().mockImplementation(async (data) => ({
        id: 'evidence-1',
        createdAt: new Date(),
        ...data,
      })),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    storage = {
      save: jest.fn().mockResolvedValue('generated-key.pdf'),
      resolvePath: jest.fn(),
    };
    useCase = new UploadSessionEvidenceUseCase(sessions, storage);
  });

  it('guarda el archivo y crea el registro de evidencia', async () => {
    const result = await useCase.execute('session-1', 'tutor-1', file);

    expect(storage.save).toHaveBeenCalledWith(file.fileBuffer, file.fileName);
    expect(sessions.createEvidence).toHaveBeenCalledWith({
      sessionId: 'session-1',
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      storageKey: 'generated-key.pdf',
      uploadedById: 'tutor-1',
    });
    expect(result.storageKey).toBe('generated-key.pdf');
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', file)).rejects.toThrow(SessionNotFoundError);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('lanza NotSessionTutorError si quien sube no es el tutor de la sesión', async () => {
    await expect(useCase.execute('session-1', 'otro-tutor', file)).rejects.toThrow(
      NotSessionTutorError,
    );
    expect(storage.save).not.toHaveBeenCalled();
    expect(sessions.createEvidence).not.toHaveBeenCalled();
  });
});
