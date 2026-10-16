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
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  phone?: string;
  service?: string | null;
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
