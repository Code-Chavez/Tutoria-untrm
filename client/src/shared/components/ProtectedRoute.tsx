import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';

/** Una vez que hubo sesión en esta carga de la página, el cierre posterior no deja la vista anterior como destino para quien entre después. */
let hadSessionInThisPage = false;

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  // Si en esta carga de la página ya hubo una sesión, quien llega aquí viene de un cierre (propio o por inactividad): esa vista no se «hereda»
  // por el estado de la navegación (la guarda `returnTo` solo cuando corresponde). El estado `from` es para quien abre un enlace sin sesión.
  useEffect(() => {
    if (isAuthenticated) hadSessionInThisPage = true;
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    // Guardamos el destino para volver a él después de iniciar sesión.
    return <Navigate to="/login" state={hadSessionInThisPage ? undefined : { from: location }} replace />;
  }

  // Con clave temporal pendiente solo se puede usar el perfil, donde se cambia (el servidor lo exige también).
  if (user?.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
