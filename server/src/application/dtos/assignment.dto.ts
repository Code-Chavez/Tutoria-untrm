export interface AssignStudentsInput {
  tutorId: string;
  studentIds: string[];
}

export interface AssignStudentsResult {
  assigned: number;
}

export interface TutorWorkload {
  tutorId: string;
  fullName: string;
  email: string;
  assignedCount: number;
  /** Escuela del tutor (null en cuentas anteriores a la regla de escuela). */
  schoolId: string | null;
}

export interface ReassignStudentInput {
  newTutorId: string;
  reason: string;
}
