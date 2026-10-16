import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { DataRequestPage } from './DataRequestPage';
import { dataRequestService, type DataRequest } from '../services/dataRequestService';
import { schoolService, type School } from '@features/tutorados/services/schoolService';

vi.mock('../services/dataRequestService', () => ({ dataRequestService: { list: vi.fn(), send: vi.fn(), markReceived: vi.fn(), setRequestEmail: vi.fn() } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));

const requests = vi.mocked(dataRequestService);
const schoolsApi = vi.mocked(schoolService);

const school = (over: Partial<School> = {}): School => ({ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, coordinatorId: 'coord-1', requestEmail: 'registros@untrm.edu.pe', ...over });
const record = (over: Partial<DataRequest> = {}): DataRequest => ({
  id: 'r1',
  createdAt: '2026-10-16T12:00:00.000Z',
  periodId: 'p1',
  periodName: '2026-II',
  schoolId: 's1',
  schoolName: 'Ingeniería de Sistemas',
  toEmail: 'registros@untrm.edu.pe',
  cycles: [3],
  note: null,
  status: 'ENVIADO',
  error: null,
  receivedAt: null,
  ...over,
});

const auth = (role: string, id = 'coord-1'): AuthContextValue => ({
  user: { id, email: 'rosa@untrm.edu.pe', firstName: 'Rosa', lastName: 'Mendoza', role },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  markPasswordChanged: vi.fn(),
});

const renderPage = (role = 'Coordinador', id = 'coord-1') =>
  render(
    <AuthContext.Provider value={auth(role, id)}>
      <MemoryRouter>
        <QueryClientTestWrapper>
          <DataRequestPage />
        </QueryClientTestWrapper>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('DataRequestPage (pedido de listas por correo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schoolsApi.getSchools.mockResolvedValue([school(), school({ id: 's2', name: 'Mecánica Eléctrica', coordinatorId: 'otro', requestEmail: null })]);
    requests.list.mockResolvedValue([]);
  });

  it('la coordinación solo ve sus escuelas, con el correo al que se pedirá', async () => {
    renderPage();

    expect(await screen.findByText('registros@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ingeniería de Sistemas' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mecánica Eléctrica' })).not.toBeInTheDocument();
  });

  it('la DBU ve todas las escuelas', async () => {
    renderPage('Administrador DBU', 'admin-1');

    expect(await screen.findByRole('option', { name: 'Mecánica Eléctrica' })).toBeInTheDocument();
  });

  it('envía el pedido con los ciclos marcados y las observaciones, y confirma a quién salió', async () => {
    requests.send.mockResolvedValue({ request: record(), sent: true });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');

    await user.click(screen.getByLabelText('3'));
    await user.click(screen.getByLabelText('4'));
    await user.type(screen.getByLabelText(/Observaciones/), 'Con urgencia');
    await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [3, 4], note: 'Con urgencia' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pedido enviado a registros@untrm.edu.pe');
  });

  it('si el correo no sale lo dice como error pero el pedido queda registrado', async () => {
    requests.send.mockResolvedValue({ request: record({ status: 'FALLIDO', error: 'MailNotConfiguredError' }), sent: false });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');

    await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/quedó registrado pero el correo no salió \(MailNotConfiguredError\)/);
  });

  it('sin correo configurado pide configurarlo ahí mismo y no deja enviar hasta guardarlo', async () => {
    schoolsApi.getSchools.mockResolvedValue([school({ requestEmail: null })]);
    requests.setRequestEmail.mockResolvedValue('nuevo@untrm.edu.pe');
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/aún no tiene un correo configurado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled();

    await user.type(screen.getByLabelText('Correo al que se piden las listas'), 'nuevo@untrm.edu.pe');
    await user.click(screen.getByRole('button', { name: 'Guardar correo' }));

    await waitFor(() => expect(requests.setRequestEmail).toHaveBeenCalledWith('s1', 'nuevo@untrm.edu.pe'));
  });

  it('permite cambiar el correo cuando quien lo recibía ya no responde', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');

    await user.click(screen.getByRole('button', { name: 'Cambiar correo' }));

    expect(screen.getByLabelText('Correo al que se piden las listas')).toHaveValue('registros@untrm.edu.pe');
  });

  it('muestra el historial y permite marcar como recibido un pedido enviado', async () => {
    requests.list.mockResolvedValue([record(), record({ id: 'r2', status: 'ENVIADO', receivedAt: '2026-10-17T12:00:00.000Z' }), record({ id: 'r3', status: 'FALLIDO' })]);
    requests.markReceived.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findAllByText(/Ingeniería de Sistemas · 2026-II/)).toHaveLength(3);
    expect(screen.getByText('Fallido')).toBeInTheDocument();
    const markButtons = screen.getAllByRole('button', { name: 'Marcar como recibido' });
    expect(markButtons).toHaveLength(1); // solo el enviado que aún no llegó

    await user.click(markButtons[0]);

    await waitFor(() => expect(requests.markReceived).toHaveBeenCalledWith('r1'));
  });
});
