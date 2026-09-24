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
}

export interface ReassignStudentInput {
  newTutorId: string;
  reason: string;
}
