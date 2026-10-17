import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach } from 'vitest';
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

  describe('secciones con pestañas', () => {
    it('«Periodo académico» y «Configuración» son una sola entrada cada una (las pestañas están dentro de la sección)', () => {
      role = 'Administrador DBU';
      renderSidebar();

      expect(screen.getByRole('link', { name: 'Periodo académico' })).toHaveAttribute('href', '/periodo');
      expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/configuracion');
      for (const tab of ['Pedir listas', 'Carga de estudiantes', 'Parámetros', 'Catálogos', 'Usuarios y roles']) {
        expect(screen.queryByRole('link', { name: tab })).not.toBeInTheDocument();
      }
    });

    it('estando en una pestaña, la entrada de su sección queda marcada', () => {
      role = 'Administrador DBU';
      renderSidebar('/parametros');

      expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Periodo académico' })).not.toHaveAttribute('aria-current');
    });

    it('«Configuración» no tiene título de grupo (es una entrada suelta) y quien no configura nada no la ve', () => {
      role = 'Docente Tutor';
      renderSidebar();

      expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument();
      role = 'Coordinador';
      renderSidebar();
      expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    });
  });

  describe('todos los grupos se despliegan y se pliegan', () => {
    beforeEach(() => localStorage.clear());

    it('los grupos de trabajo parten abiertos y se pliegan con un clic, y vuelven a abrirse', async () => {
      role = 'Administrador DBU';
      renderSidebar();

      const informes = screen.getByRole('button', { name: /Informes/ });
      expect(informes).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('link', { name: 'Indicadores' })).toBeInTheDocument();

      await userEvent.click(informes);
      expect(screen.getByRole('button', { name: /Informes/ })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('link', { name: 'Indicadores' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /Informes/ }));
      expect(screen.getByRole('link', { name: 'Indicadores' })).toBeInTheDocument();
    });

    it('«Inicio» no se pliega (es una sola entrada)', () => {
      role = 'Coordinador';
      renderSidebar();

      expect(screen.queryByRole('button', { name: /^Inicio/ })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Panel de inicio' })).toBeInTheDocument();
    });

    it('el grupo de la página actual no se oculta aunque se haya plegado, y recuerda los demás', async () => {
      role = 'Docente Tutor';
      const first = renderSidebar('/sesiones');
      await userEvent.click(screen.getByRole('button', { name: /Informes/ }));
      await userEvent.click(screen.getByRole('button', { name: /Atención a tutorados/ }));
      expect(screen.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('aria-current', 'page'); // sigue visible
      first.unmount();

      renderSidebar('/sesiones');
      expect(screen.getByRole('button', { name: /Informes/ })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('link', { name: 'Horarios y asistencia' })).not.toBeInTheDocument();
    });
  });
});
