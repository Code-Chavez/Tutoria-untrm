import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { takeReturnTo } from '@shared/utils/returnTo';
import { SessionTimeout } from './SessionTimeout';

const baseUser = { id: 'u1', email: 'a@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', role: 'Docente Tutor' };

function renderWith(user: AuthContextValue['user'], path = '/') {
  const value: AuthContextValue = { user, isAuthenticated: true, isSessionFresh: true, login: vi.fn(), logout: vi.fn(), markPasswordChanged: vi.fn() };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <SessionTimeout />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}

describe('SessionTimeout: plazo de inactividad fijado por la DBU (A08)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('avisa antes del cierre con el plazo configurado, no con el del entorno', () => {
    renderWith({ ...baseUser, idleTimeoutMinutes: 5 });

    // El aviso sale al cumplirse la inactividad: con 5 min aparece a los 5 min; con el predeterminado de 15 min aún no.
    act(() => {
      vi.advanceTimersByTime(5 * 60_000 + 1_000);
    });

    expect(screen.getByText('¿Sigues ahí?')).toBeInTheDocument();
  });

  it('sin plazo en la sesión usa el predeterminado del entorno (15 min)', () => {
    renderWith(baseUser);

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(screen.queryByText('¿Sigues ahí?')).not.toBeInTheDocument();
  });
});

describe('SessionTimeout: vuelve a la vista tras iniciar sesión de nuevo (issue #274)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('al cerrarse por inactividad guarda la vista actual con sus filtros para la misma persona', () => {
    const value = renderWith({ ...baseUser, idleTimeoutMinutes: 1 }, '/tutorados?escuela=s1&page=2');

    act(() => {
      vi.advanceTimersByTime(60_000 + 60_000 + 1_000);
    });

    expect(value.logout).toHaveBeenCalledWith({ keepDrafts: true });
    expect(takeReturnTo('u1')).toBe('/tutorados?escuela=s1&page=2');
  });

  it('al «Cerrar sesión» por decisión propia no guarda nada', () => {
    const value = renderWith({ ...baseUser, idleTimeoutMinutes: 1 }, '/tutorados?escuela=s1');

    act(() => {
      vi.advanceTimersByTime(60_000 + 1_000);
    });
    act(() => {
      screen.getByRole('button', { name: 'Cerrar sesión' }).click();
    });

    expect(value.logout).toHaveBeenCalled();
    expect(takeReturnTo('u1')).toBeNull();
  });
});
