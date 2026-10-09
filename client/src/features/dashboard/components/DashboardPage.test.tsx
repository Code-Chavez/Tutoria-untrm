import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { DashboardPage } from './DashboardPage';
import { homePanelService } from '../services/homePanelService';
import type { HomePanel } from '../services/homePanelService';

vi.mock('../services/homePanelService', () => ({ homePanelService: { getPanel: vi.fn() } }));

// Los bloques inferiores tienen sus propias pruebas y llamadas a la API.
vi.mock('./RiskAlerts', () => ({ RiskAlerts: () => <div>bloque de alertas</div> }));
vi.mock('./RecentActivity', () => ({ RecentActivity: () => <div>bloque de actividad</div> }));
let mockRole = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'Elena', lastName: 'Ramírez', role: mockRole } }),
}));

const mocked = vi.mocked(homePanelService);

const tutorPanel: HomePanel = {
  role: 'Docente Tutor',
  periodName: '2026-II',
  kpis: [
    { key: 'my-students', label: 'Mis tutorados', value: '12', hint: '3 en riesgo', tone: 'info', link: '/tutorados' },
    { key: 'alerts', label: 'Alertas pendientes', value: '2', tone: 'warning' },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientTestWrapper>
        <DashboardPage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );
}

describe('DashboardPage (paneles por rol)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'Docente Tutor';
  });

  it('muestra los indicadores propios del rol y el periodo vigente (no uno fijo)', async () => {
    mocked.getPanel.mockResolvedValue(tutorPanel);
    renderPage();

    expect(await screen.findByText('Mis tutorados')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 en riesgo')).toBeInTheDocument();
    expect(screen.getByText('Alertas pendientes')).toBeInTheDocument();
    expect(screen.getByText(/Periodo académico 2026-II/)).toBeInTheDocument();
    expect(screen.getByText('Docente Tutor')).toBeInTheDocument(); // etiqueta del rol
  });

  it('los indicadores con detalle enlazan a su vista y los demás no', async () => {
    mocked.getPanel.mockResolvedValue(tutorPanel);
    renderPage();

    const link = await screen.findByRole('link', { name: 'Mis tutorados: 12' });
    expect(link).toHaveAttribute('href', '/tutorados');
    expect(screen.queryByRole('link', { name: /Alertas pendientes/ })).not.toBeInTheDocument();
  });

  it('no inventa un periodo si no hay uno activo', async () => {
    mocked.getPanel.mockResolvedValue({ ...tutorPanel, periodName: null });
    renderPage();

    await screen.findByText('Mis tutorados');
    expect(screen.queryByText(/Periodo académico/)).not.toBeInTheDocument();
  });

  it('avisa si no se pudieron cargar los indicadores', async () => {
    mocked.getPanel.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus indicadores');
  });

  describe('el inicio muestra solo lo que cada rol puede usar (R02)', () => {
    const emptyPanel: HomePanel = { role: 'x', periodName: '2026-II', kpis: [] };

    it.each([
      ['Tutorado', ['Solicitar tutoría', 'Mis sesiones', 'Evaluar tutoría'], false, false],
      ['Docente Tutor', ['Ver tutorados', 'Mi calendario', 'Solicitudes de tutoría', 'Casos derivados'], true, false],
      ['Coordinador', ['Registrar tutorado', 'Carga masiva', 'Solicitudes de tutoría', 'Plan semestral'], true, false],
      ['Administrador DBU', ['Usuarios y roles', 'Seguimiento de derivaciones', 'Solicitudes de tutoría'], true, true],
      ['Profesional de Servicio', ['Casos derivados'], false, false],
      ['Vicerrectorado', ['Informe consolidado', 'Indicadores'], false, false],
    ])('%s: accesos propios, alertas=%s, actividad=%s', async (role, links, alerts, activity) => {
      mockRole = role as string;
      mocked.getPanel.mockResolvedValue(emptyPanel);
      renderPage();

      expect(await screen.findByText('Acciones rápidas')).toBeInTheDocument();
      for (const name of links as string[]) {
        expect(screen.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument();
      }
      expect(screen.queryByText('bloque de alertas') !== null).toBe(alerts);
      expect(screen.queryByText('bloque de actividad') !== null).toBe(activity);
      // Nunca un bloque que anuncie falta de acceso.
      expect(screen.queryByText(/Sin acceso/)).not.toBeInTheDocument();
    });

    it('los roles sin alertas no ven la tarjeta de alertas ni su título', async () => {
      mockRole = 'Tutorado';
      mocked.getPanel.mockResolvedValue(emptyPanel);
      renderPage();
      await screen.findByText('Acciones rápidas');
      expect(screen.queryByText('Alertas de inasistencia y riesgo')).not.toBeInTheDocument();
    });

    it('un rol desconocido no muestra una tarjeta de acciones vacía', async () => {
      mockRole = 'Rol inventado';
      mocked.getPanel.mockResolvedValue(emptyPanel);
      renderPage();
      await screen.findByText(/Bienvenido/);
      expect(screen.queryByText('Acciones rápidas')).not.toBeInTheDocument();
    });
  });
});
