import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ROLE_CODES } from './layout/navigation';
import { hasAnyPermission } from '../routePermissions';

interface RequireRoleProps {
  /** Roles autorizados a ver el contenido (por nombre, como viene en el JWT). */
  roles: string[];
  /** Para una cuenta con rol personalizado (que no está en `roles`): basta uno de estos permisos. Sin él, solo los roles base entran. */
  permissions?: readonly string[];
  children: ReactNode;
}

/**
 * Restringe una ruta por rol. Es una barrera de conveniencia en el cliente: la
 * autorización real la impone el servidor (middleware authorize) contra la base
 * de datos. Si el rol no está permitido, redirige a /unauthorized.
 */
export function RequireRole({ roles, permissions, children }: RequireRoleProps) {
  // `isSessionFresh` puede faltar en quien simula la sesión en una prueba: se entiende vigente.
  const { user, isSessionFresh = true } = useAuth();

  const allowed = !!user && (ROLE_CODES[user.role] !== undefined ? roles.includes(user.role) : hasAnyPermission(user.permissions, permissions));
  if (!allowed) {
    // Los permisos restaurados al abrir la aplicación son los de la última vez y pueden haber cambiado (se concedió un permiso
    // mientras la sesión estaba abierta): antes de negar el acceso se espera a confirmarlos, porque la redirección no se deshace
    // cuando llegan los vigentes. Si el dato guardado ya concede el acceso no se espera: se muestra y, si cambió, se corrige.
    if (user && !isSessionFresh) return null;
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
