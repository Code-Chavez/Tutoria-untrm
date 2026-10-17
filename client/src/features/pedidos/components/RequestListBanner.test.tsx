import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { RequestListBanner } from './RequestListBanner';
import { dataRequestService, type DataRequest } from '../services/dataRequestService';
import { schoolService, type School } from '@features/tutorados/services/schoolService';
import type { DataRequestKind } from '../services/dataRequestService';

let role = 'Coordinador';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'coord-1', role } }) }));
vi.mock('../services/dataRequestService', () => ({ dataRequestService: { list: vi.fn(), send: vi.fn(), setRequestEmail: vi.fn(), markReceived: vi.fn() } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));

const requests = vi.mocked(dataRequestService);
const school = (over: Partial<School> = {}): School => ({ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, coordinatorId: 'coord-1', requestEmail: 'registros@untrm.edu.pe', ...over });
const record = (over: Partial<DataRequest> = {}): DataRequest => ({
  id: 'r1', createdAt: '2026-10-16T12:00:00.000Z', periodId: 'p1', periodName: '2026-II', schoolId: 's1', schoolName: 'Ingeniería de Sistemas', kind: 'ESTUDIANTES',
  toEmail: 'registros@untrm.edu.pe', cycles: [], note: null, status: 'ENVIADO', error: null, receivedAt: null, ...over,
});

const renderBanner = (kind: DataRequestKind = 'ESTUDIANTES') =>
  render(
    <MemoryRouter>
      <QueryClientTestWrapper>
        <RequestListBanner kind={kind} />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('RequestListBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'Coordinador';
    vi.mocked(schoolService.getSchools).mockResolvedValue([school()]);
    requests.list.mockResolvedValue([]);
  });

  it('con el correo ya configurado, un solo clic envía el pedido de la lista de estudiantes', async () => {
    requests.send.mockResolvedValue({ request: record(), sent: true });
    renderBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir la lista por correo' }));

    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [], kind: 'ESTUDIANTES' }));
    expect(requests.send).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido enviado a registros@untrm.edu.pe');
    expect(screen.getByRole('link', { name: /Ver los pedidos/ })).toHaveAttribute('href', '/pedir-listas');
  });

  it('en la carga de docentes pide la lista de docentes tutores', async () => {
    role = 'Administrador DBU';
    requests.send.mockResolvedValue({ request: record({ kind: 'DOCENTES' }), sent: true });
    renderBanner('DOCENTES');

    expect(await screen.findByText(/lista de docentes tutores/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pedir la lista por correo' }));

    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [], kind: 'DOCENTES' }));
  });

  it('si la escuela no tiene correo, se escribe ahí mismo y el mismo clic lo guarda y envía', async () => {
    vi.mocked(schoolService.getSchools).mockResolvedValue([school({ requestEmail: null })]);
    requests.setRequestEmail.mockResolvedValue('nuevo@untrm.edu.pe');
    requests.send.mockResolvedValue({ request: record({ toEmail: 'nuevo@untrm.edu.pe' }), sent: true });
    renderBanner();

    const button = await screen.findByRole('button', { name: 'Pedir la lista por correo' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/no tiene correo configurado/), 'nuevo@untrm.edu.pe');
    await userEvent.click(button);

    await waitFor(() => expect(requests.setRequestEmail).toHaveBeenCalledWith('s1', 'nuevo@untrm.edu.pe'));
    await waitFor(() => expect(requests.send).toHaveBeenCalled());
  });

  it('la DBU con varias escuelas pide a todas de un clic y se informa a cuáles no se pudo (sin correo)', async () => {
    role = 'Administrador DBU';
    vi.mocked(schoolService.getSchools).mockResolvedValue([
      school({ id: 's1', name: 'Sistemas' }),
      school({ id: 's2', name: 'Mecánica', requestEmail: 'meca@untrm.edu.pe' }),
      school({ id: 's3', name: 'Administración', requestEmail: null }),
    ]);
    requests.send.mockResolvedValue({ request: record(), sent: true });
    renderBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir a todas las escuelas' }));

    await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido enviado a 2 escuelas');
    expect(screen.getByRole('status')).toHaveTextContent('Sin correo configurado: Administración');
  });

  it('si el correo no sale lo dice, y muestra el último pedido y si ya llegó la lista', async () => {
    requests.list.mockResolvedValue([record({ receivedAt: '2026-10-17T10:00:00.000Z' })]);
    requests.send.mockResolvedValue({ request: record({ status: 'FALLIDO', error: 'MailNotConfiguredError' }), sent: false });
    renderBanner();

    expect(await screen.findByText(/ya llegó la lista/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pedir la lista por correo' }));

    expect(await screen.findByRole('status')).toHaveTextContent('El correo no salió');
  });

  it('una coordinación sin escuelas a cargo no ve el bloque', async () => {
    vi.mocked(schoolService.getSchools).mockResolvedValue([school({ coordinatorId: 'otra-persona' })]);
    const { container } = renderBanner();

    await waitFor(() => expect(schoolService.getSchools).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
