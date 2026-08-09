import { apiClient } from '@shared/services/apiClient';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  phone?: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  phone?: string;
}

export const userService = {
  getUsers: async (filters?: { isActive?: boolean; roleId?: string }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.roleId) params.append('roleId', filters.roleId);

    const response = await apiClient.get<{ users: User[] }>(`/users?${params.toString()}`);
    return response.data.users;
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post<{ message: string; user: User }>('/users', data);
    return response.data.user;
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
