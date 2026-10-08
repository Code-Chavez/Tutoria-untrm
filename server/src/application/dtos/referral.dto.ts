import { ReferralAspectCode, ReferralService } from '@domain/entities/StudentReferral';

export interface CreateReferralInput {
  checkedAspects: ReferralAspectCode[];
  reason: string;
  service: ReferralService;
  receivingInstance?: string;
}

// Datos ya resueltos (nombres, no solo IDs) para generar la constancia
// (HU-28: "Genera la constancia de derivación").
export interface ReferralConstancia {
  referralId: string;
  studentName: string;
  studentCode: string;
  studentEmail: string | null;
  studentPhone: string | null;
  cycle: number;
  schoolName: string;
  facultyName: string;
  /** Docente tutor asignado al tutorado (puede diferir de quien deriva). */
  tutorName: string;
  referredByName: string;
  referredByEmail: string | null;
  status: string;
  reason: string;
  service: ReferralService;
  receivingInstance: string | null;
  aspects: { category: string; label: string }[];
  createdAt: Date;
}
