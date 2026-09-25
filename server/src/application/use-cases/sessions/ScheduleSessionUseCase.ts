import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { ScheduleSessionInput } from '@application/dtos/session.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
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
    private readonly students: StudentRepository,
    private readonly systemParameters: SystemParameterRepository,
  ) {}

  async execute(tutorId: string, input: ScheduleSessionInput): Promise<SessionWithParticipants> {
    for (const studentId of input.studentIds) {
      const student = await this.students.findById(studentId);
      if (!student) {
        throw new StudentNotFoundError(studentId);
      }
    }

    if (input.modality === 'PRESENCIAL' && !input.location?.trim()) {
      throw new LocationRequiredError();
    }
    if (input.modality === 'VIRTUAL' && !input.meetingLink?.trim()) {
      throw new MeetingLinkRequiredError();
    }

    const durationMinutes = await this.resolveDuration();
    const scheduledAt = new Date(input.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

    const overlapping = await this.sessions.findOverlapping(tutorId, scheduledAt, endsAt);
    if (overlapping.length > 0) {
      throw new TutorScheduleConflictError();
    }

    return this.sessions.create(
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
  }

  private async resolveDuration(): Promise<number> {
    const param = await this.systemParameters.findByKey(DURATION_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DURATION_MINUTES;
  }
}
