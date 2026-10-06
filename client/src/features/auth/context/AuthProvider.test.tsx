import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/services/queryClient';
import { tokenStorage } from '@shared/services/tokenStorage';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({ authService: { login: vi.fn() } }));

const mocked = vi.mocked(authService);

let loginError: unknown = null;

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <>
      <span data-testid="user">{user?.firstName ?? 'nadie'}</span>
      <button
        onClick={() => {
          login({ email: 'b@untrm.edu.pe', password: 'x' }).catch((e) => {
            loginError = e;
          });
        }}
      >
        entrar
      </button>
      <button onClick={logout}>salir</button>
    </>
  );
}

function renderProvider() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider: aislamiento de datos entre cuentas (A05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginError = null;
    localStorage.clear();
    sessionStorage.clear();
    queryClient.clear();
  });

  it('al salir descarta todo lo que la cuenta anterior tenía en caché', async () => {
    queryClient.setQueryData(['homePanel'], { role: 'Docente Tutor', kpis: [{ key: 'my-students', value: '12' }] });
    queryClient.setQueryData(['referrals'], [{ id: 'caso-de-A' }]);
    renderProvider();

    await act(async () => {
      screen.getByText('salir').click();
    });

    expect(queryClient.getQueryData(['homePanel'])).toBeUndefined();
    expect(queryClient.getQueryData(['referrals'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('al entrar con otra cuenta no queda nada de la sesión anterior, aunque no se haya cerrado bien (token vencido)', async () => {
    queryClient.setQueryData(['homePanel'], { role: 'Docente Tutor' });
    mocked.login.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u2', email: 'b@untrm.edu.pe', firstName: 'Beatriz', lastName: 'B', role: 'Administrador DBU' },
    });
    renderProvider();

    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('Beatriz');
    expect(queryClient.getQueryData(['homePanel'])).toBeUndefined();
  });

  it('si el login falla no hay cambio de cuenta: se conserva la caché actual', async () => {
    queryClient.setQueryData(['homePanel'], { role: 'Docente Tutor' });
    mocked.login.mockRejectedValue(new Error('credenciales'));
    renderProvider();

    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(loginError).toBeInstanceOf(Error);
    expect(queryClient.getQueryData(['homePanel'])).toEqual({ role: 'Docente Tutor' });
  });

  it('el cierre de sesión borra también los tokens', async () => {
    tokenStorage.save('a', 'r', { id: 'u', email: 'e', firstName: 'A', lastName: 'B', role: 'Docente Tutor' });
    renderProvider();

    await act(async () => {
      screen.getByText('salir').click();
    });

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(screen.getByTestId('user').textContent).toBe('nadie');
  });
});
