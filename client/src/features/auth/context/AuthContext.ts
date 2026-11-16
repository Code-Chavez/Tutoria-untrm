import { createContext } from 'react';
import type { AuthUser, LoginCredentials } from '../types/auth.types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * `false` mientras los permisos de la sesión guardada no se han confirmado con el servidor (al abrir la aplicación se restauran
   * los de la última vez, que pueden estar desactualizados). Quien decide un acceso por permisos espera a `true`; los datos de un
   * inicio de sesión recién hecho ya son vigentes.
   */
  isSessionFresh: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  /** `keepDrafts`: el cierre es por inactividad, no por decisión de la persona: lo que escribía se conserva (para la misma persona). */
  logout: (options?: { keepDrafts?: boolean }) => void;
  /** La persona ya cambió su clave temporal: se levanta el bloqueo del resto del sistema. */
  markPasswordChanged: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
