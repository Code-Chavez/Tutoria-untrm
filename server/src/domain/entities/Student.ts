export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  cycle: number;
  isAtRisk: boolean;
  riskReason?: string | null;
  riskMarkedAt?: Date | null;
  isActive: boolean;
  schoolId: string;
  tutorId?: string | null;
  assignedAt?: Date | null;
  // Cuenta de portal del propio tutorado (rol Tutorado), para autoservicio.
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
