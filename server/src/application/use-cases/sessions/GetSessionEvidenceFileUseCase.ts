import { SessionEvidence } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { SessionNotFoundError, SessionEvidenceNotFoundError } from './SessionErrors';

export interface SessionEvidenceFile {
  evidence: SessionEvidence;
  absolutePath: string;
}

/** Resuelve la evidencia y su ruta en disco para descargarla (HU-25). */
export class GetSessionEvidenceFileUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(sessionId: string, evidenceId: string): Promise<SessionEvidenceFile> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    const evidence = await this.sessions.findEvidenceById(evidenceId);
    if (!evidence || evidence.sessionId !== sessionId) {
      throw new SessionEvidenceNotFoundError(evidenceId);
    }

    return { evidence, absolutePath: this.storage.resolvePath(evidence.storageKey) };
  }
}
