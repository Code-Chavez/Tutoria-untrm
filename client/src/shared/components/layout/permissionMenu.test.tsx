import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SECTIONS, tabsFor } from './sections';
import { ROUTE_PERMISSIONS } from '../../routePermissions';

// Una cuenta con un rol personalizado («Revisor») no tiene código de rol: el menú se arma con los permisos de su rol.
let permissions: string[] = [];
let role = 'Revisor';
vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'A', lastName: 'B', role, permissions } }),
}));

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar drawerOpen={false} onClose={() => undefined} />
    </MemoryRouter>,
  );

describe('menú por permisos (rol personalizado)', () => {
  it('muestra solo las entradas que sus permisos abren, y siempre el panel de inicio', () => {
    role = 'Revisor';
    permissions = ['students:read', 'sessions:read'];
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Panel de inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estudiantes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sesiones' })).toBeInTheDocument();
    for (const hidden of ['Seguimiento', 'Derivar caso', 'Casos derivados', 'Configuración', 'Informes', 'Periodo académico', 'Solicitar tutoría']) {
      expect(screen.queryByRole('link', { name: hidden }), hidden).not.toBeInTheDocument();
    }
  });

  it('una sección aparece si algún permiso abre alguna de sus pestañas', () => {
    role = 'Revisor';
    permissions = ['audit:read'];
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Informes' })).not.toBeInTheDocument();
  });

  it('sin permisos solo queda el panel de inicio', () => {
    role = 'Revisor';
    permissions = [];
    renderSidebar();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('un rol base se sigue viendo por su rol, no por los permisos que traiga la sesión', () => {
    role = 'Docente Tutor';
    permissions = ['users:read']; // no cambia lo que ve un tutor
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Sesiones' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument();
  });
});

describe('pestañas por permisos', () => {
  it('un rol personalizado ve las pestañas que sus permisos abren; sin código ni permisos, ninguna', () => {
    const labels = (granted: string[]) => tabsFor('configuracion', undefined, granted).map((t) => t.label);
    expect(labels(['users:read', 'audit:read'])).toEqual(['Usuarios y roles', 'Bitácora de auditoría']);
    expect(labels([])).toEqual([]);
  });

  it('cada pestaña de las secciones declara el permiso que la abre (para que un rol personalizado pueda verla)', () => {
    for (const section of Object.values(SECTIONS)) {
      for (const tab of section.tabs) expect(tab.permissions, tab.label).toEqual(ROUTE_PERMISSIONS[tab.path as keyof typeof ROUTE_PERMISSIONS]);
    }
  });
});
