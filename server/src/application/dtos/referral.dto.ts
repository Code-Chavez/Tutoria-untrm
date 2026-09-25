import { ReferralAspectCode, ReferralService } from '@domain/entities/StudentReferral';

export interface CreateReferralInput {
  checkedAspects: ReferralAspectCode[];
  reason: string;
  service: ReferralService;
}

// Datos ya resueltos (nombres, no solo IDs) para generar la constancia
// (HU-28: "Genera la constancia de derivación").
export interface ReferralConstancia {
  referralId: string;
  studentName: string;
  studentCode: string;
  cycle: number;
  schoolName: string;
  referredByName: string;
  reason: string;
  service: ReferralService;
  aspects: { category: string; label: string }[];
  createdAt: Date;
}
