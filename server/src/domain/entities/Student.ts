export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  cycle: number;
  isAtRisk: boolean;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}
