import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository, SessionFilters } from '@domain/repositories/SessionRepository';

export class ListSessionsUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  execute(filters?: SessionFilters): Promise<SessionWithParticipants[]> {
    return this.sessions.findAll(filters);
  }
}
