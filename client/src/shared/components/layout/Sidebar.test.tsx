import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

let role = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'A', lastName: 'B', role } }),
}));

function renderSidebar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar drawerOpen={false} onClose={() => undefined} />
    </MemoryRouter>,
  );
}

describe('Sidebar (A15): cada acceso habilitado conduce a una tarea', () => {
  it('ningún acceso queda como «Próx.» sin destino', () => {
    for (const r of ['Docente Tutor', 'Coordinador', 'Tutorado', 'Administrador DBU', 'Profesional de Servicio', 'Vicerrectorado']) {
      role = r;
      const { container, unmount } = renderSidebar();
      expect(screen.queryByText('Próx.')).not.toBeInTheDocument();
      container.querySelectorAll('nav a').forEach((a) => expect(a.getAttribute('href')).toBeTruthy());
      unmount();
    }
  });

  it('el tutor llega a entrevista, seguimiento y derivación eligiendo al tutorado', () => {
    role = 'Docente Tutor';
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Entrevista inicial' })).toHaveAttribute('href', '/tutorados?accion=entrevista');
    expect(screen.getByRole('link', { name: 'Seguimiento' })).toHaveAttribute('href', '/tutorados?accion=seguimiento');
    expect(screen.getByRole('link', { name: 'Derivar caso' })).toHaveAttribute('href', '/tutorados?accion=derivar');
  });

  it('solo el acceso de la acción actual queda marcado, no «Tutorados»', () => {
    role = 'Docente Tutor';
    renderSidebar('/tutorados?accion=seguimiento');
    expect(screen.getByRole('link', { name: 'Seguimiento' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tutorados' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Entrevista inicial' })).not.toHaveAttribute('aria-current');
  });

  it('el tutorado tiene su agenda en «Mis sesiones»', () => {
    role = 'Tutorado';
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Mis sesiones' })).toHaveAttribute('href', '/mis-sesiones');
  });

  it('el coordinador no ve «Casos derivados» (no tiene visibilidad de casos individuales)', () => {
    role = 'Coordinador';
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Casos derivados' })).not.toBeInTheDocument();
    role = 'Profesional de Servicio';
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Casos derivados' })).toBeInTheDocument();
  });
});
