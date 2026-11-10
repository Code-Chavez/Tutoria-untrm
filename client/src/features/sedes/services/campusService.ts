import { apiClient } from '@shared/services/apiClient';

export interface Campus {
  id: string;
  name: string;
  isActive: boolean;
  /** Ciudad de la sede para la fecha del certificado; nula = la predeterminada (Chachapoyas). */
  city?: string | null;
  /** Sede o filial: solo informativo. */
  kind?: CampusKind;
}

export type CampusKind = 'SEDE' | 'FILIAL';

export interface CampusSchool {
  id: string;
  name: string;
  facultyId: string;
  campusId: string | null;
  /** Todas las sedes donde se dicta (la principal incluida). */
  campusIds?: string[];
}

export interface CampusOverview {
  campuses: Campus[];
  schools: CampusSchool[];
}

export const campusService = {
  overview: async (): Promise<CampusOverview> => (await apiClient.get<CampusOverview>('/campuses')).data,
  create: async (name: string, kind: CampusKind = 'SEDE'): Promise<Campus> => (await apiClient.post<{ campus: Campus }>('/campuses', { name, kind })).data.campus,
  update: async (id: string, changes: { name?: string; isActive?: boolean; city?: string | null; kind?: CampusKind }): Promise<Campus> =>
    (await apiClient.patch<{ campus: Campus }>(`/campuses/${id}`, changes)).data.campus,
  setSchoolCampuses: async (schoolId: string, campusIds: string[]): Promise<void> => {
    await apiClient.put(`/schools/${schoolId}/campuses`, { campusIds });
  },
  setSchoolCampus: async (schoolId: string, campusId: string): Promise<void> => {
    await apiClient.put(`/schools/${schoolId}/campus`, { campusId });
  },
};
