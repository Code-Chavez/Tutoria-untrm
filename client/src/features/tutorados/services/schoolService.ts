import { apiClient } from '@shared/services/apiClient';

export interface School {
  id: string;
  name: string;
  facultyId: string;
  isActive: boolean;
  coordinatorId?: string | null;
  /** Sede donde se dicta la escuela. */
  campusId?: string | null;
  /** Correo al que se piden las listas de estudiantes de la escuela. */
  requestEmail?: string | null;
}

export const schoolService = {
  getSchools: async (): Promise<School[]> => {
    const response = await apiClient.get<{ schools: School[] }>('/schools');
    return response.data.schools;
  },
};
