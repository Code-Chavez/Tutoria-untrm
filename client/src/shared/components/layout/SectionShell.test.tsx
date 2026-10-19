import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('muestra las pestañas del rol y, debajo, la pantalla de la pestaña actual (marcada)', () => {
    role = 'Administrador DBU';
    renderAt('/asignacion');

    const nav = screen.getByRole('navigation', { name: 'Secciones de Periodo académico' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Pedir listas', 'Carga de estudiantes', 'Carga de docentes', 'Asignación por ciclo', 'Cierre de periodo', 'Pendientes']);
    expect(screen.getByRole('link', { name: 'Asignación por ciclo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Pantalla de asignación')).toBeInTheDocument();
  });

  it('cada rol ve solo sus pestañas: la coordinación no tiene la carga de docentes ni el cierre', () => {
    role = 'Coordinador';
    renderAt('/pedir-listas');

    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Pedir listas', 'Carga de estudiantes', 'Asignación por ciclo', 'Pendientes']);
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

  it('lleva la pestaña activa a la vista y avisa con una flecha si hay pestañas fuera de la pantalla (U05)', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(800); // las pestañas ocupan más de lo que cabe
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    role = 'Administrador DBU';
    try {
      renderAt('/asignacion');

      expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' });
      expect(screen.getByRole('button', { name: 'Ver más pestañas' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver pestañas anteriores' })).not.toBeInTheDocument(); // aún no se desplazó
    } finally {
      vi.restoreAllMocks();
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('si las pestañas caben, no hay flechas', () => {
    role = 'Administrador DBU';
    renderAt('/asignacion');
    expect(screen.queryByRole('button', { name: 'Ver más pestañas' })).not.toBeInTheDocument();
  });
});
