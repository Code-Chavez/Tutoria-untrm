import { apiClient } from '@shared/services/apiClient';

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
};
