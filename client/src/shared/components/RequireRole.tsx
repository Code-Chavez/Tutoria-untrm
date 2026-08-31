import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';

interface RequireRoleProps {
  /** Roles autorizados a ver el contenido (por nombre, como viene en el JWT). */
  roles: string[];
  children: ReactNode;
}

/**
 * Restringe una ruta por rol. Es una barrera de conveniencia en el cliente: la
 * autorización real la impone el servidor (middleware authorize) contra la base
 * de datos. Si el rol no está permitido, redirige a /unauthorized.
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
