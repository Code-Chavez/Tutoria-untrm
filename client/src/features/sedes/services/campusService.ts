import { apiClient } from '@shared/services/apiClient';

export interface Campus {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CampusSchool {
  id: string;
  name: string;
  facultyId: string;
  campusId: string | null;
}

export interface CampusOverview {
  campuses: Campus[];
  schools: CampusSchool[];
}

export const campusService = {
  overview: async (): Promise<CampusOverview> => (await apiClient.get<CampusOverview>('/campuses')).data,
  create: async (name: string): Promise<Campus> => (await apiClient.post<{ campus: Campus }>('/campuses', { name })).data.campus,
  update: async (id: string, changes: { name?: string; isActive?: boolean }): Promise<Campus> =>
    (await apiClient.patch<{ campus: Campus }>(`/campuses/${id}`, changes)).data.campus,
  setSchoolCampus: async (schoolId: string, campusId: string): Promise<void> => {
    await apiClient.put(`/schools/${schoolId}/campus`, { campusId });
  },
};
