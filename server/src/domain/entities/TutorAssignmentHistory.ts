export interface TutorAssignmentHistory {
  id: string;
  studentId: string;
  previousTutorId?: string | null;
  newTutorId: string;
  reason: string;
  reassignedById: string;
  createdAt: Date;
}
