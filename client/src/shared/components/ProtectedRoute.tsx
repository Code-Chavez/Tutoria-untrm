import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Guardamos el destino para volver a él después de iniciar sesión.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Con clave temporal pendiente solo se puede usar el perfil, donde se cambia (el servidor lo exige también).
  if (user?.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
