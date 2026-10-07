import { SessionEvidence } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { SessionNotFoundError } from './SessionErrors';

export interface SessionEvidenceWithUploader extends SessionEvidence {
  uploadedByName: string;
}

/** Lista las evidencias de una sesión (HU-25), con el nombre de quien la subió. */
export class ListSessionEvidenceUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(sessionId: string, requesterId: string): Promise<SessionEvidenceWithUploader[]> {
    const session = await this.sessions.findById(sessionId);
    // La evidencia (PDF o imágenes) es del tutor de la sesión, la DBU y el coordinador de la escuela.
    if (!session || !(await this.guard.canSeeSession(requesterId, session))) {
      throw new SessionNotFoundError(sessionId);
    }

    const evidences = await this.sessions.listEvidenceBySession(sessionId);
    const uploaderIds = [...new Set(evidences.map((e) => e.uploadedById))];
    const uploaders = await Promise.all(uploaderIds.map((id) => this.users.findById(id)));
    const nameById = new Map(
      uploaderIds.map((id, i) => {
        const user = uploaders[i];
        return [id, user ? `${user.firstName} ${user.lastName}` : 'Desconocido'];
      }),
    );

    return evidences.map((e) => ({
      ...e,
      uploadedByName: nameById.get(e.uploadedById) ?? 'Desconocido',
    }));
  }
}
