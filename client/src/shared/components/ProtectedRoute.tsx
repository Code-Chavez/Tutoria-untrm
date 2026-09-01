import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Guardamos el destino para volver a él después de iniciar sesión.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
