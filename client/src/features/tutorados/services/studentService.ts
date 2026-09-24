import { apiClient } from '@shared/services/apiClient';

// Dispara la descarga de un blob en el navegador.
function saveBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  cycle: number;
  isAtRisk: boolean;
  riskReason?: string | null;
  riskMarkedAt?: string | null;
  isActive: boolean;
  schoolId: string;
  tutorId?: string | null;
  assignedAt?: string | null;
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

export interface ImportRowError {
  row: number;
  studentCode?: string;
  message: string;
}

export interface ImportCreatedRow {
  row: number;
  studentCode: string;
  fullName: string;
}

export interface ImportReport {
  totalRows: number;
  created: number;
  skipped: number;
  createdRows: ImportCreatedRow[];
  errors: ImportRowError[];
}

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

  markRisk: async (id: string, isAtRisk: boolean, reason?: string): Promise<Student> => {
    const response = await apiClient.patch<{ message: string; student: Student }>(
      `/students/${id}/risk`,
      { isAtRisk, reason },
    );
    return response.data.student;
  },

  importStudents: async (file: File): Promise<ImportReport> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ message: string; report: ImportReport }>(
      '/students/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.report;
  },

  downloadTemplate: async (): Promise<void> => {
    const response = await apiClient.get('/students/import/template', { responseType: 'blob' });
    saveBlob(response.data as Blob, 'plantilla-tutorados.xlsx');
  },

  downloadImportReport: async (report: ImportReport): Promise<void> => {
    const response = await apiClient.post('/students/import/report', report, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, 'reporte-carga-tutorados.xlsx');
  },
};
