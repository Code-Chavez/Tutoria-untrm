import { apiClient } from '@shared/services/apiClient';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  phone?: string;
  photoUrl?: string;
  /** Servicio al que pertenece un Profesional de Servicio; nulo en los demás roles. */
  service?: string | null;
  /** Escuela profesional del docente tutor; nulo en los demás roles y en tutores anteriores a esta regla. */
  schoolId?: string | null;
  /** Facultad del Decano; nulo en los demás roles. */
  facultyId?: string | null;
  isActive: boolean;
  /** Pendiente de activación: aún no creó su contraseña con la invitación. */
  mustChangePassword?: boolean;
}

/** Invitación de acceso único para activar una cuenta. */
export interface Invitation {
  link: string;
  expiresAt: string;
  /** El correo salió hacia el servidor SMTP; si es false hay que entregar el enlace por otro medio. */
  emailSent: boolean;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  phone?: string;
  service?: string | null;
  schoolId?: string | null;
  facultyId?: string | null;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  phone?: string;
  service?: string | null;
  schoolId?: string | null;
  facultyId?: string | null;
}

export const userService = {
  getUsers: async (filters?: { isActive?: boolean; roleId?: string }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.roleId) params.append('roleId', filters.roleId);

    const response = await apiClient.get<{ users: User[] }>(`/users?${params.toString()}`);
    return response.data.users;
  },

  /** Crea la cuenta (sin clave) y devuelve su invitación de acceso único. */
  createUser: async (data: CreateUserData): Promise<{ user: User; invitation: Invitation }> => {
    const response = await apiClient.post<{ message: string; user: User; invitation: Invitation }>('/users', data);
    return { user: response.data.user, invitation: response.data.invitation };
  },

  /** Emite una invitación nueva (la anterior deja de servir). */
  reissueInvitation: async (id: string): Promise<Invitation> => {
    const response = await apiClient.post<{ message: string; invitation: Invitation }>(`/users/${id}/invitation`);
    return response.data.invitation;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.patch<{ message: string; user: User }>(`/users/${id}`, data);
    return response.data.user;
  },

  toggleUserStatus: async (id: string): Promise<User> => {
    const response = await apiClient.patch<{ message: string; user: User }>(`/users/${id}/status`);
    return response.data.user;
  },
};

export interface TutorImportReport {
  totalRows: number;
  created: number;
  skipped: number;
  createdRows: { row: number; email: string; fullName: string; school: string; emailSent: boolean; invitationLink?: string }[];
  errors: { row: number; email?: string; message: string }[];
}

export const tutorImportService = {
  importTutors: async (file: File): Promise<TutorImportReport> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ report: TutorImportReport }>('/tutors/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.report;
  },

  downloadTemplate: async (): Promise<void> => {
    const response = await apiClient.get('/tutors/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-docentes-tutores.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
