import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { TutoringRequestLinker } from '@application/use-cases/tutoring-requests/TutoringRequestLinker';
import { InvalidTutoringRequestStatusError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { ScheduleSessionInput } from '@application/dtos/session.dto';
import {
  TutorScheduleConflictError,
  LocationRequiredError,
  MeetingLinkRequiredError,
} from './SessionErrors';

const DEFAULT_DURATION_MINUTES = 45; // Art. 15.c, usado si el parámetro no está configurado.
const DURATION_PARAM_KEY = 'session_duration_minutes';

/**
 * Programa una sesión de tutoría individual o grupal (HU-18/HU-19, Art. 15.c
 * y Art. 7.b: la tutoría grupal admite dos o más tutorados para abordar
 * temas comunes). La duración sale del parámetro del sistema (45 min por
 * defecto) y se valida que el tutor no tenga otra sesión que se solape con
 * el horario elegido.
 */
export class ScheduleSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly guard: StudentAccessGuard,
    private readonly systemParameters: SystemParameterRepository,
    private readonly requestLinker?: TutoringRequestLinker,
  ) {}

  async execute(tutorId: string, input: ScheduleSessionInput, ipAddress?: string): Promise<SessionWithParticipants> {
    // Un tutor solo programa sesiones con los tutorados que tiene asignados.
    await this.guard.assertAccessToAll(tutorId, input.studentIds);

    if (input.modality === 'PRESENCIAL' && !input.location?.trim()) {
      throw new LocationRequiredError();
    }
    if (input.modality === 'VIRTUAL' && !input.meetingLink?.trim()) {
      throw new MeetingLinkRequiredError();
    }

    // Si la sesión atiende una solicitud, se valida antes de crear nada (es suya, es de ese estudiante, sin atención previa).
    const request = input.tutoringRequestId && this.requestLinker ? await this.requestLinker.prepare(tutorId, input.tutoringRequestId, input.studentIds) : null;

    const durationMinutes = await this.resolveDuration();
    const scheduledAt = new Date(input.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

    const overlapping = await this.sessions.findOverlapping(tutorId, scheduledAt, endsAt);
    if (overlapping.length > 0) {
      throw new TutorScheduleConflictError();
    }

    const session = await this.sessions.create(
      {
        tutorId,
        topic: input.topic.trim(),
        scheduledAt,
        durationMinutes,
        endsAt,
        modality: input.modality,
        location: input.modality === 'PRESENCIAL' ? input.location!.trim() : null,
        meetingLink: input.modality === 'VIRTUAL' ? input.meetingLink!.trim() : null,
        cancelledAt: null,
        cancelReason: null,
      },
      input.studentIds,
    );

    if (request && this.requestLinker && !(await this.requestLinker.attach(tutorId, request, { kind: 'session', id: session.id }, ipAddress))) {
      // Otra persona vinculó la solicitud en el mismo instante: no queda una sesión suelta.
      await this.sessions.cancel(session.id, new Date(), 'La solicitud ya fue atendida por otra sesión o derivación');
      throw new InvalidTutoringRequestStatusError('Esta solicitud acaba de recibir otra atención: no se crea una segunda sesión.');
    }
    return session;
  }

  private async resolveDuration(): Promise<number> {
    const param = await this.systemParameters.findByKey(DURATION_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DURATION_MINUTES;
  }
}
