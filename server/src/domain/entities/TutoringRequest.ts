// Solicitud de tutoría (HU-17, Art. 19.b/19.c del Protocolo).
export type TutoringRequestSource = 'STUDENT' | 'INSTRUCTOR';
export type TutoringCaseType = 'ACADEMIC' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'HEALTH';
export type TutoringRequestRoutedRole = 'tutor' | 'coordinator';

// Atención de la solicitud (R01): solo avanza; se puede pasar de PENDIENTE directo a ATENDIDA.
export type TutoringRequestStatus = 'PENDIENTE' | 'EN_ATENCION' | 'ATENDIDA';
export const TUTORING_REQUEST_STATUSES: readonly TutoringRequestStatus[] = ['PENDIENTE', 'EN_ATENCION', 'ATENDIDA'];

export interface TutoringRequest {
  id: string;
  studentId: string;
  requestedById: string;
  source: TutoringRequestSource;
  instructorName?: string | null;
  courseName?: string | null;
  caseType: TutoringCaseType;
  reason: string;
  routedToId: string;
  routedToRole: TutoringRequestRoutedRole;
  status: TutoringRequestStatus;
  /** Respuesta para el estudiante; obligatoria al marcar la solicitud como atendida. */
  responseNote: string | null;
  handledById: string | null;
  handledAt: Date | null;
  /** Sesión en la que se atendió, si se vinculó. */
  sessionId: string | null;
  createdAt: Date;
}

/** Una solicitud con los nombres ya resueltos, lista para mostrarse. */
export interface TutoringRequestView extends TutoringRequest {
  studentName: string;
  studentCode: string;
  routedToName: string;
  handledByName: string | null;
}
