import { apiClient } from '@shared/services/apiClient';

export interface Faculty {
  id: string;
  name: string;
}

export const facultyService = {
  getFaculties: async (): Promise<Faculty[]> => {
    const response = await apiClient.get<{ faculties: Faculty[] }>('/faculties');
    return response.data.faculties;
  },
};
