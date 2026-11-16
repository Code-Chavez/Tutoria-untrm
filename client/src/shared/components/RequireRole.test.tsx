import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { RequireRole } from './RequireRole';
import { profileService } from '@features/profile/services/profileService';

vi.mock('@features/profile/services/profileService', () => ({ profileService: { get: vi.fn() } }));
const mockedProfile = vi.mocked(profileService);
const profileOf = (role: string, permissions: string[]) => ({ id: 'u1', email: 'x@untrm.edu.pe', firstName: 'X', lastName: 'Y', role, permissions }) as never;

function seedSession(role: string, permissions?: string[]) {
  localStorage.setItem('sit.accessToken', 'token');
  localStorage.setItem('sit.refreshToken', 'refresh');
  localStorage.setItem(
    'sit.user',
    JSON.stringify({
      id: 'u1',
      email: 'x@untrm.edu.pe',
      firstName: 'X',
      lastName: 'Y',
      role,
      permissions,
    }),
  );
}

function renderGuarded(permissions?: readonly string[]) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['Administrador DBU']} permissions={permissions}>
                <h1>Panel de administración</h1>
              </RequireRole>
            }
          />
          <Route path="/unauthorized" element={<h1>Acceso denegado</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('RequireRole', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedProfile.get.mockReset();
    mockedProfile.get.mockRejectedValue(new Error('sin red'));
  });

  it('muestra el contenido cuando el rol está autorizado', () => {
    seedSession('Administrador DBU');
    renderGuarded();
    expect(screen.getByRole('heading', { name: /panel de administración/i })).toBeInTheDocument();
  });

  it('redirige a /unauthorized cuando el rol no está autorizado', async () => {
    seedSession('Docente Tutor');
    renderGuarded();
    expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /panel de administración/i })).not.toBeInTheDocument();
  });

  it('una cuenta con rol personalizado entra si su rol concede el permiso de la pantalla, y si no, no', () => {
    seedSession('Revisor', ['users:read']);
    renderGuarded(['users:read', 'users:write']);
    expect(screen.getByRole('heading', { name: /panel de administración/i })).toBeInTheDocument();
  });

  it('un rol personalizado sin el permiso, o una pantalla sin permisos declarados, redirige', async () => {
    seedSession('Revisor', ['reports:read']);
    const first = renderGuarded(['users:read']);
    expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    first.unmount();
    localStorage.clear();
    seedSession('Revisor', ['users:read']);
    renderGuarded();
    expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('un rol base se rige por su rol: los permisos de la sesión no le abren lo que su rol no autoriza', async () => {
    seedSession('Docente Tutor', ['users:read']);
    renderGuarded(['users:read']);
    expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  describe('permisos guardados que ya no son los vigentes', () => {
    it('si se concedió el permiso mientras la sesión estaba abierta, abre la pantalla en lugar de redirigir', async () => {
      // Lo guardado es de la última vez (sin el permiso); el servidor ya lo concede.
      seedSession('Revisor', ['reports:read']);
      mockedProfile.get.mockResolvedValue(profileOf('Revisor', ['reports:read', 'users:read']));
      renderGuarded(['users:read']);
      expect(await screen.findByRole('heading', { name: /panel de administración/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /acceso denegado/i })).not.toBeInTheDocument();
    });

    it('mientras no se confirman no se niega el acceso: no muestra ni la pantalla ni «Acceso denegado»', async () => {
      seedSession('Revisor', ['reports:read']);
      let answer: (value: never) => void = () => undefined;
      mockedProfile.get.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      renderGuarded(['users:read']);
      expect(screen.queryByRole('heading', { name: /acceso denegado/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /panel de administración/i })).not.toBeInTheDocument();
      answer(profileOf('Revisor', ['reports:read']));
      expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    });

    it('si el servidor confirma que el permiso se retiró, la pantalla que se mostró pasa a «Acceso denegado»', async () => {
      seedSession('Revisor', ['users:read']);
      mockedProfile.get.mockResolvedValue(profileOf('Revisor', ['reports:read']));
      renderGuarded(['users:read']);
      expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    });

    it('si no se puede consultar el servidor se conserva lo guardado', async () => {
      seedSession('Revisor', ['reports:read']);
      renderGuarded(['users:read']);
      expect(await screen.findByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    });
  });
});
