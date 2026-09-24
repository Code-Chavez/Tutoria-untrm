// Solicitud de tutoría (HU-17, Art. 19.b/19.c del Protocolo).
export type TutoringRequestSource = 'STUDENT' | 'INSTRUCTOR';
export type TutoringCaseType = 'ACADEMIC' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'HEALTH';
export type TutoringRequestRoutedRole = 'tutor' | 'coordinator';

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
  createdAt: Date;
}
