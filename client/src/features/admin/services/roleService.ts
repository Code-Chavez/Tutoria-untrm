import { apiClient } from '@shared/services/apiClient';

export interface Permission {
  id?: string;
  code: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  /** Los siete roles sembrados: se ven y se copian, no se modifican ni se desactivan. */
  isBase?: boolean;
  isActive?: boolean;
  userCount?: number;
  permissions?: Permission[];
}

export interface RoleInput {
  name: string;
  description: string;
  permissions: string[];
  copyFromRoleId?: string;
}

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get<{ roles: Role[] }>('/roles');
    return response.data.roles;
  },
  getPermissionCatalog: async (): Promise<Permission[]> => {
    const response = await apiClient.get<{ permissions: Permission[] }>('/roles/permissions');
    return response.data.permissions;
  },
  create: async (input: RoleInput): Promise<Role> => (await apiClient.post<{ role: Role }>('/roles', input)).data.role,
  update: async (id: string, changes: { description?: string; permissions?: string[] }): Promise<Role> =>
    (await apiClient.put<{ role: Role }>(`/roles/${id}`, changes)).data.role,
  setActive: async (id: string, isActive: boolean): Promise<Role> =>
    (await apiClient.patch<{ role: Role }>(`/roles/${id}/status`, { isActive })).data.role,
};
