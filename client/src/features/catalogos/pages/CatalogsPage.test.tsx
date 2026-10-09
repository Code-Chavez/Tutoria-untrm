import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CatalogsPage } from './CatalogsPage';
import { catalogService } from '../services/catalogService';
import type { CatalogEntry } from '../services/catalogService';

vi.mock('../services/catalogService', async () => {
  const actual = await vi.importActual<typeof import('../services/catalogService')>('../services/catalogService');
  return { ...actual, catalogService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } };
});

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

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <CatalogsPage />
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
});
