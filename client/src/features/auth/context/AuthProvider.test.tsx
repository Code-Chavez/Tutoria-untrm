import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/services/queryClient';
import { tokenStorage } from '@shared/services/tokenStorage';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { readDraft, writeDraft } from '@shared/utils/drafts';

vi.mock('../services/authService', () => ({ authService: { login: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) } }));

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
      <button onClick={() => logout()}>salir</button>
      <button onClick={() => logout({ keepDrafts: true })}>expirar</button>
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

  it('la identidad visual sobrevive al cambio de sesión: su consulta sigue siendo la misma y no queda sin observar', async () => {
    queryClient.setQueryData(['branding'], { shortName: 'SIT · UNTRM' });
    queryClient.setQueryData(['homePanel'], { role: 'Docente Tutor' });
    const before = queryClient.getQueryCache().find({ queryKey: ['branding'] });
    renderProvider();

    await act(async () => {
      screen.getByText('salir').click();
    });

    expect(queryClient.getQueryData(['homePanel'])).toBeUndefined();
    // Si se borrara, el proveedor de identidad quedaría atado a una consulta eliminada y no vería los cambios guardados después.
    expect(queryClient.getQueryCache().find({ queryKey: ['branding'] })).toBe(before);
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
    expect(mocked.logout).toHaveBeenCalledWith('r'); // el refresh token se revoca en el servidor
    expect(screen.getByTestId('user').textContent).toBe('nadie');
  });
});

describe('AuthProvider: política de sesión (A08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  it('guarda con la sesión el plazo de inactividad que fijó la DBU', async () => {
    mocked.login.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      sessionPolicy: { idleTimeoutMinutes: 25 },
      user: { id: 'u1', email: 'b@untrm.edu.pe', firstName: 'Beto', lastName: 'Paz', role: 'Docente Tutor' },
    });
    renderProvider();

    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(tokenStorage.getUser<{ idleTimeoutMinutes?: number }>()?.idleTimeoutMinutes).toBe(25);
  });
});

describe('AuthProvider: borradores y privacidad (U07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    queryClient.clear();
  });

  it('al cerrar sesión por decisión propia no queda ningún borrador', async () => {
    writeDraft('u1', 'solicitud', { reason: 'algo privado' });
    renderProvider();

    await act(async () => {
      screen.getByText('salir').click();
    });

    expect(readDraft('u1', 'solicitud')).toBeNull();
  });

  it('si el cierre es por inactividad, lo que escribía se conserva para cuando vuelva a entrar', async () => {
    writeDraft('u1', 'solicitud', { reason: 'a medias' });
    renderProvider();

    await act(async () => {
      screen.getByText('expirar').click();
    });

    expect(readDraft('u1', 'solicitud')).toEqual({ reason: 'a medias' });
  });

  it('al entrar otra persona, los borradores de la anterior se descartan y los propios se conservan', async () => {
    writeDraft('u1', 'solicitud', { reason: 'de la primera persona' });
    writeDraft('u2', 'solicitud', { reason: 'de la segunda' });
    mocked.login.mockResolvedValue({ user: { id: 'u2', email: 'b@untrm.edu.pe', firstName: 'B', lastName: 'B', role: 'Tutorado' }, accessToken: 'a', refreshToken: 'r' } as never);
    renderProvider();

    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(readDraft('u1', 'solicitud')).toBeNull();
    expect(readDraft('u2', 'solicitud')).toEqual({ reason: 'de la segunda' });
  });
});
