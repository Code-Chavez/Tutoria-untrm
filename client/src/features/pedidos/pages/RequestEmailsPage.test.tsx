import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { RequestEmailsPage } from './RequestEmailsPage';
import { dataRequestService } from '../services/dataRequestService';
import { schoolService, type School } from '@features/tutorados/services/schoolService';

let role = 'Coordinador';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'coord-1', role } }) }));
vi.mock('../services/dataRequestService', () => ({ dataRequestService: { list: vi.fn(), send: vi.fn(), setRequestEmail: vi.fn(), markReceived: vi.fn() } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));

const requests = vi.mocked(dataRequestService);
const school = (over: Partial<School> = {}): School => ({ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, coordinatorId: 'coord-1', requestEmail: 'registros@untrm.edu.pe', ...over });

const renderPage = (url = '/correos-escuelas') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientTestWrapper>
        <RequestEmailsPage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('RequestEmailsPage (configuración del correo de pedido de listas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'Coordinador';
    vi.mocked(schoolService.getSchools).mockResolvedValue([school(), school({ id: 's2', name: 'Mecánica', requestEmail: null }), school({ id: 's3', name: 'Ajena', coordinatorId: 'otra-persona' })]);
  });

  it('la coordinación ve solo sus escuelas, con su correo o «Sin configurar»', async () => {
    renderPage();

    expect(await screen.findByText('registros@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByText('Sin configurar')).toBeInTheDocument();
    expect(screen.queryByText('Ajena')).not.toBeInTheDocument();
  });

  it('la DBU ve todas las escuelas', async () => {
    role = 'Administrador DBU';
    renderPage();

    expect(await screen.findByText('Ajena')).toBeInTheDocument();
  });

  it('guarda el correo de una escuela y lo confirma', async () => {
    requests.setRequestEmail.mockResolvedValue('nuevo@untrm.edu.pe');
    renderPage();

    await userEvent.type(await screen.findByLabelText('Correo de Mecánica'), 'nuevo@untrm.edu.pe');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(requests.setRequestEmail).toHaveBeenCalledWith('s2', 'nuevo@untrm.edu.pe'));
    expect(await screen.findByRole('status')).toHaveTextContent('Correo de Mecánica guardado');
  });

  it('puede quitar un correo y muestra el motivo real si el servidor rechaza el guardado', async () => {
    requests.setRequestEmail.mockResolvedValueOnce(null).mockRejectedValueOnce(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'El correo no tiene un formato válido' } } }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Quitar el correo de Ingeniería de Sistemas' }));
    await waitFor(() => expect(requests.setRequestEmail).toHaveBeenCalledWith('s1', null));

    await userEvent.type(screen.getByLabelText('Correo de Mecánica'), 'malo');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El correo no tiene un formato válido');
  });

  it('lleva a «Pedir listas» una vez configurado', async () => {
    renderPage('/correos-escuelas?escuela=s2');

    expect(await screen.findByRole('link', { name: /Pedir las listas/ })).toHaveAttribute('href', '/pedir-listas');
  });

  it('con el correo ya configurado se ve el correo y un botón «Editar»; al pulsarlo se corrige y se guarda', async () => {
    requests.setRequestEmail.mockResolvedValue('correcto@untrm.edu.pe');
    renderPage();

    expect(screen.queryByLabelText('Correo de Ingeniería de Sistemas')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar el correo de Ingeniería de Sistemas' }));
    await userEvent.type(screen.getByLabelText('Correo de Ingeniería de Sistemas'), 'correcto@untrm.edu.pe');
    await userEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    await waitFor(() => expect(requests.setRequestEmail).toHaveBeenCalledWith('s1', 'correcto@untrm.edu.pe'));
    expect(await screen.findByRole('status')).toHaveTextContent('Correo de Ingeniería de Sistemas guardado');
    expect(screen.queryByLabelText('Correo de Ingeniería de Sistemas')).not.toBeInTheDocument();
  });

  it('«Cancelar» cierra la edición sin cambiar nada, y llegar con ?escuela=… abre esa escuela para editar', async () => {
    renderPage('/correos-escuelas?escuela=s1');

    expect(await screen.findByLabelText('Correo de Ingeniería de Sistemas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Correo de Ingeniería de Sistemas')).not.toBeInTheDocument();
    expect(requests.setRequestEmail).not.toHaveBeenCalled();
  });
});
