import { createContext } from 'react';
import type { AuthUser, LoginCredentials } from '../types/auth.types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  /** `keepDrafts`: el cierre es por inactividad, no por decisión de la persona: lo que escribía se conserva (para la misma persona). */
  logout: (options?: { keepDrafts?: boolean }) => void;
  /** La persona ya cambió su clave temporal: se levanta el bloqueo del resto del sistema. */
  markPasswordChanged: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
