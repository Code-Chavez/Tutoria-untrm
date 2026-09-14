import { apiClient } from '@shared/services/apiClient';

export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  cycle: number;
  isAtRisk: boolean;
  isActive: boolean;
  schoolId: string;
}

export interface StudentFilters {
  schoolId?: string;
  cycle?: number;
  isActive?: boolean;
  isAtRisk?: boolean;
  search?: string;
}

export interface CreateStudentData {
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  cycle: number;
  schoolId: string;
}

export type UpdateStudentData = Partial<CreateStudentData>;

export const studentService = {
  getStudents: async (filters?: StudentFilters): Promise<Student[]> => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    if (filters?.cycle !== undefined) params.append('cycle', String(filters.cycle));
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.isAtRisk !== undefined) params.append('isAtRisk', String(filters.isAtRisk));
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<{ students: Student[] }>(`/students?${params.toString()}`);
    return response.data.students;
  },

  createStudent: async (data: CreateStudentData): Promise<Student> => {
    const response = await apiClient.post<{ message: string; student: Student }>('/students', data);
    return response.data.student;
  },

  updateStudent: async (id: string, data: UpdateStudentData): Promise<Student> => {
    const response = await apiClient.patch<{ message: string; student: Student }>(
      `/students/${id}`,
      data,
    );
    return response.data.student;
  },
};
