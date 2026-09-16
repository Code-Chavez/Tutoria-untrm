import { useCallback, useEffect, useState } from 'react';
import { User, userService } from '../services/userService';
import { Role, roleService } from '../services/roleService';

interface State {
  users: User[];
  roles: Role[];
  loading: boolean;
  error: boolean;
}

/** Carga usuarios y roles. El filtrado se resuelve en el cliente. */
export function useUsers() {
  const [state, setState] = useState<State>({ users: [], roles: [], loading: true, error: false });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let ignore = false;

    Promise.all([userService.getUsers(), roleService.getRoles().catch(() => [])])
      .then(([users, roles]) => {
        if (ignore) return;
        setState({ users, roles, loading: false, error: false });
      })
      .catch(() => {
        if (ignore) return;
        setState({ users: [], roles: [], loading: false, error: true });
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return { ...state, refresh };
}
