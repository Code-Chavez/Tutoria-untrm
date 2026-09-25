import { SessionEvidence } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { UploadSessionEvidenceInput } from '@application/dtos/session.dto';
import { SessionNotFoundError, NotSessionTutorError } from './SessionErrors';

/**
 * Adjunta una evidencia (PDF o imagen) a una sesión (HU-25) para respaldar
 * los informes semestrales (Art. 15.d). Exclusivo del tutor de la sesión,
 * igual que reprogramar/cancelar (HU-23).
 */
export class UploadSessionEvidenceUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(
    sessionId: string,
    tutorId: string,
    file: UploadSessionEvidenceInput,
  ): Promise<SessionEvidence> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    if (session.tutorId !== tutorId) {
      throw new NotSessionTutorError();
    }

    const storageKey = await this.storage.save(file.fileBuffer, file.fileName);
    return this.sessions.createEvidence({
      sessionId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      storageKey,
      uploadedById: tutorId,
    });
  }
}
