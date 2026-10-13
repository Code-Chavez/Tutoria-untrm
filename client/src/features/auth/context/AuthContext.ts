import { createContext } from 'react';
import type { AuthUser, LoginCredentials } from '../types/auth.types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  /** La persona ya cambió su clave temporal: se levanta el bloqueo del resto del sistema. */
  markPasswordChanged: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
