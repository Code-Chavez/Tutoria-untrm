import { apiClient } from '@shared/services/apiClient';

export interface School {
  id: string;
  name: string;
  facultyId: string;
  isActive: boolean;
}

export const schoolService = {
  getSchools: async (): Promise<School[]> => {
    const response = await apiClient.get<{ schools: School[] }>('/schools');
    return response.data.schools;
  },
};
