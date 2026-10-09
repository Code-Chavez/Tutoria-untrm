import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { tokenStorage } from '@shared/services/tokenStorage';
import { queryClient } from '@shared/services/queryClient';
import { authService } from '../services/authService';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import { AuthContext, type AuthContextValue } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  // La sesión se rehidrata desde el almacenamiento para sobrevivir a un refresh.
  const [user, setUser] = useState<AuthUser | null>(() =>
    tokenStorage.getUser<AuthUser>(),
  );

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authService.login(credentials);
    // Nada de la sesión anterior debe sobrevivir a un cambio de cuenta: ni datos en caché ni consultas en vuelo.
    await queryClient.cancelQueries();
    queryClient.clear();
    tokenStorage.save(result.accessToken, result.refreshToken, result.user);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    // Los datos en caché son de la persona que sale (derivaciones, expedientes, panel de inicio).
    void queryClient.cancelQueries();
    queryClient.clear();
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) authService.logout(refreshToken).catch(() => undefined);
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
