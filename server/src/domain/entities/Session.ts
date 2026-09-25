// Modalidad de la sesión (HU-20, Art. 8): presencial registra el lugar,
// virtual el enlace de videollamada.
export type SessionModality = 'PRESENCIAL' | 'VIRTUAL';

// Sesión de tutoría (HU-18, Art. 15.c: 45 minutos, individual o grupal).
export interface Session {
  id: string;
  tutorId: string;
  topic: string;
  scheduledAt: Date;
  durationMinutes: number;
  endsAt: Date;
  modality: SessionModality;
  location: string | null;
  meetingLink: string | null;
  createdAt: Date;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  studentId: string;
}

// Sesión con sus participantes, para exponer al cliente en una sola pieza.
export interface SessionWithParticipants extends Session {
  studentIds: string[];
}
