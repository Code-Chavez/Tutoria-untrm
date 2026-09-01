import { apiClient } from '@shared/services/apiClient';

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get<{ roles: Role[] }>('/roles');
    return response.data.roles;
  },
};
