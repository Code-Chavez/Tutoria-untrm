import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CatalogsPage } from './CatalogsPage';
import { catalogService } from '../services/catalogService';
import type { CatalogEntry } from '../services/catalogService';

vi.mock('../services/catalogService', async () => {
  const actual = await vi.importActual<typeof import('../services/catalogService')>('../services/catalogService');
  return { ...actual, catalogService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } };
});

vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
const mocked = vi.mocked(catalogService);

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: 'e1',
  kind: 'faculties',
  name: 'Ingeniería',
  isActive: true,
  code: null,
  facultyId: null,
  startDate: null,
  endDate: null,
  usage: 0,
  ...over,
});

function Where() {
  const { search } = useLocation();
  return <output aria-label="url">{search}</output>;
}

function renderPage(url = '/catalogos') {
  return render(
    <QueryClientTestWrapper>
      <MemoryRouter initialEntries={[url]}>
        <CatalogsPage />
        <Where />
      </MemoryRouter>
    </QueryClientTestWrapper>,
  );
}

describe('CatalogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.list.mockImplementation(async (kind) =>
      kind === 'faculties'
        ? [entry({ id: 'f1', name: 'Ingeniería', usage: 3 }), entry({ id: 'f2', name: 'Salud', isActive: false, usage: 0 })]
        : [],
    );
  });

  it('lista la facultad con su estado y cuántos registros la usan', async () => {
    renderPage();

    const row = (await screen.findByText('Ingeniería')).closest('tr') as HTMLElement;
    expect(within(row).getByText('Activo')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByText('Salud').closest('tr') as HTMLElement).getByText('Inactivo')).toBeInTheDocument();
  });

  it('no deja eliminar lo que está en uso, pero sí lo que no', async () => {
    renderPage();
    await screen.findByText('Ingeniería');

    expect(screen.getByRole('button', { name: 'Eliminar Ingeniería' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar Salud' })).toBeEnabled();
  });

  it('elimina tras confirmar', async () => {
    mocked.remove.mockResolvedValue();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Salud');

    await user.click(screen.getByRole('button', { name: 'Eliminar Salud' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mocked.remove).toHaveBeenCalledWith('faculties', 'f2'));
  });

  it('activa y desactiva sin pasar por el formulario', async () => {
    mocked.update.mockResolvedValue(entry());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ingeniería');

    await user.click(screen.getByRole('button', { name: 'Desactivar Ingeniería' }));

    await waitFor(() => expect(mocked.update).toHaveBeenCalledWith('faculties', 'f1', { isActive: false }));
  });

  it('crea una facultad nueva', async () => {
    mocked.create.mockResolvedValue(entry());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ingeniería');

    await user.click(screen.getByRole('button', { name: /Nueva facultad/ }));
    await user.type(screen.getByLabelText('Nombre'), 'Ciencias');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(mocked.create).toHaveBeenCalledWith('faculties', { name: 'Ciencias' }));
  });

  it('muestra el error de la API (p. ej. duplicado) sin cerrar el formulario', async () => {
    mocked.create.mockRejectedValue(
      Object.assign(new AxiosError('conflict'), { response: { status: 409, data: { error: 'Ya existe un elemento con ese nombre o código en el catálogo' } } }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ingeniería');

    await user.click(screen.getByRole('button', { name: /Nueva facultad/ }));
    await user.type(screen.getByLabelText('Nombre'), 'Salud');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ya existe/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('en los ciclos el código se pide al crear y no se puede editar después', async () => {
    mocked.list.mockImplementation(async (kind) =>
      kind === 'cycles' ? [entry({ id: 'c1', kind: 'cycles', name: 'Ciclo 3', code: '3' })] : [],
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Ciclos' }));
    await screen.findByText('Ciclo 3');
    await user.click(screen.getByRole('button', { name: 'Editar Ciclo 3' }));

    expect(screen.getByLabelText('Número de ciclo')).toBeDisabled();
    expect(screen.getByLabelText('Número de ciclo')).toHaveValue('3');
  });

  it('los botones de alta respetan el género de cada catálogo (UI-08)', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('button', { name: 'Nueva facultad' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Escuelas' }));
    expect(await screen.findByRole('button', { name: 'Nueva escuela profesional' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Periodos' }));
    expect(await screen.findByRole('button', { name: 'Nuevo periodo académico' })).toBeInTheDocument();
  });

  it('permite configurar la cantidad de ciclos al editar una escuela', async () => {
    mocked.list.mockImplementation(async (kind) => kind === 'schools' ? [entry({ id: 's1', kind, name: 'Sistemas', facultyId: 'f1', cycleCount: 10 })] : kind === 'faculties' ? [entry({ id: 'f1', name: 'Ingeniería' })] : []);
    mocked.update.mockResolvedValue(entry({ id: 's1', kind: 'schools', name: 'Sistemas', facultyId: 'f1', cycleCount: 12 }));
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Escuelas' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Sistemas' }));
    const input = screen.getByLabelText('Cantidad de ciclos de la escuela');
    expect(input).toHaveValue(10);
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocked.update).toHaveBeenCalledWith('schools', 's1', expect.objectContaining({ cycleCount: 12 })));
  });
});

describe('CatalogsPage: el estado de la pantalla vive en la URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocked.list.mockImplementation(async (kind) => (kind === 'faculties' ? [entry({ id: 'f1', name: 'Ingeniería', usage: 3 })] : []));
  });

  it('cambiar de pestaña, abrir «Editar» y «Eliminar» ponen su estado en la URL', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ingeniería');
    await user.click(screen.getByRole('button', { name: 'Editar Ingeniería' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('editar=f1');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByLabelText('url')).toBeEmptyDOMElement();

    await user.click(screen.getByRole('tab', { name: 'Escuelas' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('tipo=schools');
  });

  it('un enlace con tipo y ventana vuelve al mismo lugar; uno a un elemento inexistente se limpia', async () => {
    const first = renderPage('/catalogos?editar=f1');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    first.unmount();

    renderPage('/catalogos?tipo=schools&nuevo=1');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Escuelas' })).toHaveAttribute('aria-selected', 'true');
  });

  it('un elemento que no existe no deja ventana abierta', async () => {
    renderPage('/catalogos?editar=nada&eliminar=nada');
    await screen.findByText('Ingeniería');
    await vi.waitFor(() => expect(screen.getByLabelText('url')).toBeEmptyDOMElement());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lo escrito en un elemento nuevo se recupera al recargar y se puede descartar', async () => {
    const user = userEvent.setup();
    const first = renderPage('/catalogos?nuevo=1');
    await user.type(await screen.findByLabelText(/Nombre/), 'Derecho');
    first.unmount();

    renderPage('/catalogos?nuevo=1');
    expect(await screen.findByLabelText(/Nombre/)).toHaveValue('Derecho');
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
  });
});
