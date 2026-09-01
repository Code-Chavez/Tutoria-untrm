import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(route: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<h1>Iniciar sesión</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<h1>Panel principal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function seedSession() {
  localStorage.setItem('sit.accessToken', 'access-token');
  localStorage.setItem('sit.refreshToken', 'refresh-token');
  localStorage.setItem(
    'sit.user',
    JSON.stringify({
      id: 'user-1',
      email: 'tutor@untrm.edu.pe',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'Docente Tutor',
    }),
  );
}

describe('ProtectedRoute', () => {
  it('redirige al login cuando no hay sesión', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /panel principal/i })).not.toBeInTheDocument();
  });

  it('permite el acceso cuando hay una sesión guardada', () => {
    seedSession();

    renderAt('/');

    expect(screen.getByRole('heading', { name: /panel principal/i })).toBeInTheDocument();
  });

  it('ignora una sesión corrupta en el almacenamiento', () => {
    localStorage.setItem('sit.user', 'no-es-json');

    renderAt('/');

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
  });
});
