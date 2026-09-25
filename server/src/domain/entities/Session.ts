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
  // Cancelación (HU-23): no nulo = cancelada. La sesión se conserva (trazabilidad).
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
}

// Tipo de cambio trazado sobre una sesión (HU-23).
export type SessionChangeType = 'RESCHEDULE' | 'CANCEL';

export interface SessionChangeHistory {
  id: string;
  sessionId: string;
  changeType: SessionChangeType;
  reason: string;
  previousScheduledAt: Date | null;
  newScheduledAt: Date | null;
  changedById: string;
  createdAt: Date;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  studentId: string;
}

// Registro de asistencia de una sesión individual (HU-22, Anexo N°4):
// reemplaza la firma del tutorado por una confirmación digital.
export interface SessionAttendance {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  confirmedAt: Date;
  createdAt: Date;
}

// Sesión con sus participantes, para exponer al cliente en una sola pieza.
export interface SessionWithParticipants extends Session {
  studentIds: string[];
  attendance: SessionAttendance | null;
}

// Evidencia (PDF o imagen) adjunta a una sesión (HU-25) para respaldar los
// informes semestrales (Art. 15.d). El archivo vive en disco bajo storageKey;
// aquí solo su metadata (quién la subió y cuándo).
export interface SessionEvidence {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  uploadedById: string;
  createdAt: Date;
}
