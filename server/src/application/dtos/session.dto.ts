import { SessionModality } from '@domain/entities/Session';

export interface ScheduleSessionInput {
  // Uno o más estudiantes: 1 = sesión individual (HU-18), 2+ = grupal (HU-19,
  // Art. 7.b). Mismo caso de uso y modelo de datos para ambos casos.
  studentIds: string[];
  topic: string;
  scheduledAt: string; // ISO datetime
  // Modalidad (HU-20, Art. 8): presencial exige location, virtual exige meetingLink.
  modality: SessionModality;
  location?: string;
  meetingLink?: string;
}

// Reprogramación de sesión (HU-23): solo cambia el horario; duración,
// modalidad y participantes se conservan.
export interface RescheduleSessionInput {
  scheduledAt: string; // ISO datetime
  reason: string;
}

export interface CancelSessionInput {
  reason: string;
}
