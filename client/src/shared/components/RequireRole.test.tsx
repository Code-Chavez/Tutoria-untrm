import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { RequireRole } from './RequireRole';

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
  beforeEach(() => localStorage.clear());

  it('muestra el contenido cuando el rol está autorizado', () => {
    seedSession('Administrador DBU');
    renderGuarded();
    expect(screen.getByRole('heading', { name: /panel de administración/i })).toBeInTheDocument();
  });

  it('redirige a /unauthorized cuando el rol no está autorizado', () => {
    seedSession('Docente Tutor');
    renderGuarded();
    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /panel de administración/i })).not.toBeInTheDocument();
  });

  it('una cuenta con rol personalizado entra si su rol concede el permiso de la pantalla, y si no, no', () => {
    seedSession('Revisor', ['users:read']);
    renderGuarded(['users:read', 'users:write']);
    expect(screen.getByRole('heading', { name: /panel de administración/i })).toBeInTheDocument();
  });

  it('un rol personalizado sin el permiso, o una pantalla sin permisos declarados, redirige', () => {
    seedSession('Revisor', ['reports:read']);
    const first = renderGuarded(['users:read']);
    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    first.unmount();
    localStorage.clear();
    seedSession('Revisor', ['users:read']);
    renderGuarded();
    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('un rol base se rige por su rol: los permisos de la sesión no le abren lo que su rol no autoriza', () => {
    seedSession('Docente Tutor', ['users:read']);
    renderGuarded(['users:read']);
    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });
});
