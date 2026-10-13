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

  /** Devuelve la cuenta y su clave temporal, que el servidor entrega una sola vez. */
  createUser: async (data: CreateUserData): Promise<{ user: User; temporaryPassword?: string }> => {
    const response = await apiClient.post<{ message: string; user: User; temporaryPassword?: string }>('/users', data);
    return { user: response.data.user, temporaryPassword: response.data.temporaryPassword };
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
