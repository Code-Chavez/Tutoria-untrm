import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { LoginPage } from './LoginPage';
import { authService } from '../services/authService';
import type { LoginResult } from '../types/auth.types';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn() },
}));

const loginMock = vi.mocked(authService.login);

const loginResult: LoginResult = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'user-1',
    email: 'tutor@untrm.edu.pe',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'Docente Tutor',
  },
};

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Panel principal</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillAndSubmit(email = 'tutor@untrm.edu.pe', password = 'Password123!') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/correo institucional/i), email);
  await user.type(screen.getByLabelText(/contraseña/i), password);
  await user.click(screen.getByRole('button', { name: /ingresar/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envía las credenciales ingresadas al servicio de autenticación', async () => {
    loginMock.mockResolvedValue(loginResult);
    renderLogin();

    await fillAndSubmit();

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'tutor@untrm.edu.pe',
        password: 'Password123!',
      });
    });
  });

  it('redirige al panel principal tras un login exitoso', async () => {
    loginMock.mockResolvedValue(loginResult);
    renderLogin();

    await fillAndSubmit();

    expect(await screen.findByRole('heading', { name: /panel principal/i })).toBeInTheDocument();
  });

  it('persiste la sesión para sobrevivir a una recarga', async () => {
    loginMock.mockResolvedValue(loginResult);
    renderLogin();

    await fillAndSubmit();

    await waitFor(() => {
      expect(localStorage.getItem('sit.accessToken')).toBe('access-token');
    });
    expect(JSON.parse(localStorage.getItem('sit.user') ?? '{}')).toMatchObject({
      email: 'tutor@untrm.edu.pe',
      role: 'Docente Tutor',
    });
  });

  it('muestra el mensaje de error que devuelve la API', async () => {
    loginMock.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 401, data: { status: 'error', message: 'Credenciales inválidas' } },
      }),
    );
    renderLogin();

    await fillAndSubmit('tutor@untrm.edu.pe', 'incorrecta1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('no deja la sesión iniciada cuando el login falla', async () => {
    loginMock.mockRejectedValue(new Error('Network Error'));
    renderLogin();

    await fillAndSubmit();

    await screen.findByRole('alert');
    expect(localStorage.getItem('sit.accessToken')).toBeNull();
    expect(screen.queryByRole('heading', { name: /panel principal/i })).not.toBeInTheDocument();
  });

  it('alterna la visibilidad de la contraseña sin perder lo escrito', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/contraseña/i);
    await user.type(passwordInput, 'Password123!');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar la clave/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('Password123!');

    await user.click(screen.getByRole('button', { name: /ocultar la clave/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('deshabilita el botón mientras la petición está en curso', async () => {
    let resolveLogin: (value: LoginResult) => void = () => {};
    loginMock.mockImplementation(
      () => new Promise<LoginResult>((resolve) => { resolveLogin = resolve; }),
    );
    renderLogin();

    await fillAndSubmit();

    const button = screen.getByRole('button', { name: /ingresando/i });
    expect(button).toBeDisabled();

    resolveLogin(loginResult);
    await waitFor(() => expect(loginMock).toHaveBeenCalled());
  });
});
