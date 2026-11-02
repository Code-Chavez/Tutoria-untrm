import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roleService, type RoleInput } from '../services/roleService';

const ROLES_KEY = ['roles'] as const;

export function useRoleList() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: () => roleService.getRoles() });
}

export function usePermissionCatalog() {
  return useQuery({ queryKey: ['role-permission-catalog'], queryFn: () => roleService.getPermissionCatalog(), staleTime: Infinity });
}

/** Un cambio de rol cambia lo que ven las cuentas y la lista de roles de los formularios de usuarios. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ROLES_KEY }), queryClient.invalidateQueries({ queryKey: ['users'] })]);
}

export function useCreateRole() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: RoleInput) => roleService.create(input), onSuccess: refresh });
}

export function useUpdateRole() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, ...changes }: { id: string; description?: string; permissions?: string[] }) => roleService.update(id, changes), onSuccess: refresh });
}

export function useSetRoleActive() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => roleService.setActive(id, isActive), onSuccess: refresh });
}
