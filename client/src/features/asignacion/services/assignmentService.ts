import { apiClient } from '@shared/services/apiClient';
import type { Student } from '@features/tutorados/services/studentService';

export interface TutorWorkload {
  tutorId: string;
  fullName: string;
  email: string;
  assignedCount: number;
}

export const assignmentService = {
  getTutorWorkload: async (): Promise<TutorWorkload[]> => {
    const response = await apiClient.get<{ tutors: TutorWorkload[] }>('/tutors/workload');
    return response.data.tutors;
  },

  assignStudents: async (tutorId: string, studentIds: string[]): Promise<number> => {
    const response = await apiClient.post<{ message: string; assigned: number }>(
      '/students/assign',
      { tutorId, studentIds },
    );
    return response.data.assigned;
  },

  reassignStudent: async (studentId: string, newTutorId: string, reason: string): Promise<Student> => {
    const response = await apiClient.patch<{ message: string; student: Student }>(
      `/students/${studentId}/reassign`,
      { newTutorId, reason },
    );
    return response.data.student;
  },
};
