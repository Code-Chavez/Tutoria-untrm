import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CampusesPage } from './CampusesPage';
import { campusService } from '../services/campusService';

vi.mock('../services/campusService', () => ({
  campusService: { overview: vi.fn(), create: vi.fn(), update: vi.fn(), setSchoolCampus: vi.fn() },
}));
const mocked = vi.mocked(campusService);

const overview = {
  campuses: [
    { id: 'c1', name: 'Sede Central', isActive: true },
    { id: 'c2', name: 'Sede Bagua', isActive: true },
    { id: 'c3', name: 'Sede Vieja', isActive: false },
  ],
  schools: [{ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', campusId: 'c1' }],
};

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <CampusesPage />
    </QueryClientTestWrapper>,
  );

describe('CampusesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.overview.mockResolvedValue(overview);
  });

  it('lista las sedes con su estado y la sede de cada escuela', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Desactivar Sede Bagua' })).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    expect(screen.getByLabelText('Ingeniería de Sistemas')).toHaveValue('c1');
  });

  it('cambia la sede de una escuela', async () => {
    mocked.setSchoolCampus.mockResolvedValue();
    renderPage();

    await userEvent.selectOptions(await screen.findByLabelText('Ingeniería de Sistemas'), 'c2');

    await waitFor(() => expect(mocked.setSchoolCampus).toHaveBeenCalledWith('s1', 'c2'));
  });

  it('agrega una sede nueva y limpia el campo', async () => {
    mocked.create.mockResolvedValue({ id: 'c4', name: 'Sede Condorcanqui', isActive: true });
    renderPage();

    const input = await screen.findByLabelText('Nueva sede');
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
    await userEvent.type(input, 'Sede Condorcanqui');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(mocked.create).toHaveBeenCalledWith('Sede Condorcanqui'));
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('desactiva una sede', async () => {
    mocked.update.mockResolvedValue({ id: 'c2', name: 'Sede Bagua', isActive: false });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar Sede Bagua' }));

    await waitFor(() => expect(mocked.update).toHaveBeenCalledWith('c2', { isActive: false }));
  });

  it('muestra el motivo real si el servidor rechaza el cambio', async () => {
    mocked.create.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'Ya existe una sede llamada «Sede Bagua»' } } }));
    renderPage();

    await userEvent.type(await screen.findByLabelText('Nueva sede'), 'Sede Bagua');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ya existe una sede/);
  });
});
