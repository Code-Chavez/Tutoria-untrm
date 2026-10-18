import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { tokenStorage } from '@shared/services/tokenStorage';
import { clearSessionData, queryClient } from '@shared/services/queryClient';
import { clearAllDrafts, clearDraftsExcept } from '@shared/utils/drafts';
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
    clearSessionData();
    clearDraftsExcept(result.user.id); // los borradores de otra persona no sobreviven a un cambio de cuenta
    const sessionUser = { ...result.user, idleTimeoutMinutes: result.sessionPolicy?.idleTimeoutMinutes };
    tokenStorage.save(result.accessToken, result.refreshToken, sessionUser);
    setUser(sessionUser);
  }, []);

  const logout = useCallback((options?: { keepDrafts?: boolean }) => {
    // Los datos en caché son de la persona que sale (derivaciones, expedientes, panel de inicio).
    void queryClient.cancelQueries();
    clearSessionData();
    if (options?.keepDrafts !== true) clearAllDrafts();
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) authService.logout(refreshToken).catch(() => undefined);
    tokenStorage.clear();
    setUser(null);
  }, []);

  const markPasswordChanged = useCallback(() => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, mustChangePassword: false };
      tokenStorage.saveUser(updated);
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, markPasswordChanged }),
    [user, login, logout, markPasswordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
