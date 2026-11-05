import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { roleService } from '../services/roleService';

const USERS_KEY = ['users'] as const;
const ROLES_KEY = ['roles'] as const;

/** Carga usuarios y roles (cacheados). El filtrado se resuelve en el cliente. */
export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: USERS_KEY, queryFn: () => userService.getUsers() });
  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => roleService.getRoles().catch(() => []),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    queryClient.invalidateQueries({ queryKey: ROLES_KEY });
  };

  return {
    users: usersQuery.data ?? [],
    roles: rolesQuery.data ?? [],
    loading: usersQuery.isLoading || rolesQuery.isLoading,
    error: usersQuery.isError,
    refresh,
  };
}

/** Dominios de correo permitidos para las cuentas (RF-01). Casi nunca cambian: se piden una vez. */
export function useEmailPolicy() {
  const query = useQuery({ queryKey: ['users', 'email-policy'], queryFn: () => userService.getEmailPolicy(), staleTime: Infinity });
  return query.data;
}
