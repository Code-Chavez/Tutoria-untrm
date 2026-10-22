import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SectionHome, SectionShell } from './SectionShell';

let role = 'Administrador DBU';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role } }) }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="periodo" element={<SectionHome section="periodo" />} />
        <Route path="configuracion" element={<SectionHome section="configuracion" />} />
        <Route element={<SectionShell section="periodo" />}>
          <Route path="pedir-listas" element={<p>Pantalla de pedir listas</p>} />
          <Route path="asignacion" element={<p>Pantalla de asignación</p>} />
          <Route path="carga-masiva" element={<p>Pantalla de carga de estudiantes</p>} />
          <Route path="carga-docentes" element={<p>Pantalla de carga de docentes</p>} />
          <Route path="pendientes" element={<p>Pantalla de pendientes</p>} />
        </Route>
        <Route element={<SectionShell section="configuracion" />}>
          <Route path="sedes" element={<p>Pantalla de sedes</p>} />
          <Route path="correos-escuelas" element={<p>Pantalla de correos</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('SectionShell (pantallas juntas con pestañas)', () => {
  it('permite plegar un grupo sin abandonar la pantalla actual y volver a desplegarlo', async () => {
    role = 'Administrador DBU';
    renderAt('/asignacion');
    await userEvent.click(screen.getByText('Organización', { exact: true }));
    expect(screen.getByText('Organización', { exact: true }).closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Asignación por ciclo')).not.toBeVisible();
    expect(screen.getByText('Pantalla de asignación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pendientes' })).toBeVisible();
    await userEvent.click(screen.getByText('Organización', { exact: true }));
    expect(screen.getByRole('link', { name: 'Asignación por ciclo' })).toHaveAttribute('aria-current', 'page');
  });

  it('conserva la descripción accesible y permite descartar la ayuda con Escape', async () => {
    role = 'Coordinador';
    renderAt('/pedir-listas');
    const link = screen.getByRole('link', { name: 'Pedir listas' });
    expect(link).toHaveAccessibleDescription('Solicitar las listas a las escuelas');
    link.focus();
    await userEvent.keyboard('{Escape}');
    expect(link).toHaveAttribute('data-hint-hidden', 'true');
    expect(link).toHaveFocus();
  });

  it('la guía avanza solo por los pasos permitidos del rol y permite volver', async () => {
    role = 'Coordinador';
    renderAt('/carga-masiva');
    expect(screen.getByText('Paso 2 de 3 del flujo sugerido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente: Asignación por ciclo' }));
    expect(screen.getByText('Pantalla de asignación')).toBeInTheDocument();
    expect(screen.getByText('Paso 3 de 3 del flujo sugerido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Siguiente:/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Anterior: Carga de estudiantes' }));
    expect(screen.getByText('Pantalla de carga de estudiantes')).toBeInTheDocument();
  });

  it('presenta pendientes como seguimiento y no como un paso final completado', () => {
    role = 'Administrador DBU';
    renderAt('/pendientes');
    expect(screen.getByText('Seguimiento durante todo el periodo')).toBeInTheDocument();
    expect(screen.queryByText(/Paso \d de/)).not.toBeInTheDocument();
    expect(screen.getByText(/no es un paso que debas dejar para el final/)).toBeInTheDocument();
  });

  it('muestra las pestañas del rol y, debajo, la pantalla de la pestaña actual (marcada)', () => {
    role = 'Administrador DBU';
    renderAt('/asignacion');

    const nav = screen.getByRole('navigation', { name: 'Secciones de Periodo académico' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('aria-label') ?? a.textContent)).toEqual(['Pedir listas', 'Carga de estudiantes', 'Carga de docentes', 'Asignación por ciclo', 'Pendientes', 'Cierre de periodo']);
    expect(screen.getByRole('link', { name: 'Asignación por ciclo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Pantalla de asignación')).toBeInTheDocument();
  });

  it('cada rol ve solo sus pestañas: la coordinación no tiene la carga de docentes ni el cierre', () => {
    role = 'Coordinador';
    renderAt('/pedir-listas');

    expect(screen.getAllByRole('link').map((a) => a.getAttribute('aria-label') ?? a.textContent)).toEqual(['Pedir listas', 'Carga de estudiantes', 'Asignación por ciclo', 'Pendientes']);
  });

  it('con una sola pestaña no dibuja la barra (solo está la pantalla)', () => {
    role = 'Vicerrectorado';
    renderAt('/sedes');

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('Pantalla de sedes')).toBeInTheDocument();
  });

  it('la entrada de la sección lleva a la primera pestaña que la persona puede usar', () => {
    role = 'Coordinador';
    renderAt('/configuracion');
    expect(screen.getByText('Pantalla de correos')).toBeInTheDocument();
  });

  it('el vicerrector entra a Configuración por las sedes', () => {
    role = 'Vicerrectorado';
    renderAt('/configuracion');
    expect(screen.getByText('Pantalla de sedes')).toBeInTheDocument();
  });

  it('Configuración usa grupos laterales y permite navegar también con el selector móvil', async () => {
    role = 'Administrador DBU';
    renderAt('/correos-escuelas');
    const nav = screen.getByRole('navigation', { name: 'Secciones de Configuración' });
    expect(nav).toHaveTextContent('Organización');
    expect(nav).toHaveTextContent('Sistema y acceso');
    expect(screen.getByRole('link', { name: 'Correos de las escuelas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Ver más pestañas' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Sección de configuración'), '/sedes');
    expect(screen.getByText('Pantalla de sedes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sedes' })).toHaveAttribute('aria-current', 'page');
  });

  it('si las pestañas caben, no hay flechas', () => {
    role = 'Administrador DBU';
    renderAt('/asignacion');
    expect(screen.queryByRole('button', { name: 'Ver más pestañas' })).not.toBeInTheDocument();
  });
});
