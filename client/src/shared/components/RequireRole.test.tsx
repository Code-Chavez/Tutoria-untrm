import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { RequireRole } from './RequireRole';

function seedSession(role: string) {
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
    }),
  );
}

function renderGuarded() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['Administrador DBU']}>
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
});
