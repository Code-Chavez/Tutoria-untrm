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
  kind: 'ESTUDIANTES',
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

const renderPage = (role = 'Coordinador', id = 'coord-1', url = '/pedir-listas') =>
  render(
    <AuthContext.Provider value={auth(role, id)}>
      <MemoryRouter initialEntries={[url]}>
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

    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [3, 4], note: 'Con urgencia', kind: 'ESTUDIANTES' }));
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

  it('sin correo configurado solo avisa y ofrece un botón que lleva a configurarlo; no deja enviar', async () => {
    schoolsApi.getSchools.mockResolvedValue([school({ requestEmail: null })]);
    renderPage();

    expect(await screen.findByText(/aún no tiene un correo configurado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurar correo' })).toHaveAttribute('href', '/correos-escuelas?escuela=s1');
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: /Correo/ })).not.toBeInTheDocument();
  });

  it('con el correo configurado lo muestra y «Editar correo» lleva a la configuración (aquí no se edita)', async () => {
    renderPage();

    expect(await screen.findByText('registros@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar correo' })).toHaveAttribute('href', '/correos-escuelas?escuela=s1');
    expect(screen.queryByLabelText('Correo al que se piden las listas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeEnabled();
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

  it('si llega desde la carga de docentes, la DBU ya tiene elegida la lista de docentes tutores', async () => {
    renderPage('Administrador DBU', 'dbu-1', '/pedir-listas?lista=docentes');

    expect(await screen.findByLabelText('Qué lista pedir')).toHaveValue('DOCENTES');
  });

  it('U13: al pedir docentes cambian título, plantilla, destino y siguientes pasos; al volver a estudiantes, también', async () => {
    const user = userEvent.setup();
    renderPage('Administrador DBU', 'dbu-1', '/pedir-listas');
    expect(await screen.findByRole('heading', { name: 'Pedir listas de estudiantes' })).toBeInTheDocument();
    expect(await screen.findByText(/código, nombres, apellidos, correo, teléfono, ciclo y escuela/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carga de estudiantes' })).toHaveAttribute('href', '/carga-masiva');

    await user.selectOptions(await screen.findByLabelText('Qué lista pedir'), 'DOCENTES');

    expect(screen.getByRole('heading', { name: 'Pedir la lista de docentes tutores' })).toBeInTheDocument();
    expect(screen.getByText(/nombres, apellidos, correo institucional, teléfono \(opcional\) y escuela/)).toBeInTheDocument();
    expect(screen.queryByText(/código, nombres, apellidos, correo, teléfono, ciclo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ciclos \(sin marcar = todos\)/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carga de docentes' })).toHaveAttribute('href', '/carga-docentes');
    expect(screen.getByRole('navigation', { name: 'Cuando llegue la lista de docentes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Carga de estudiantes' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Qué lista pedir'), 'ESTUDIANTES');
    expect(screen.getByRole('heading', { name: 'Pedir listas de estudiantes' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Cuando llegue la lista de estudiantes' })).toBeInTheDocument();
  });

  it('el historial dice de qué lista es cada pedido', async () => {
    requests.list.mockResolvedValue([record(), record({ id: 'r9', kind: 'DOCENTES' })]);
    renderPage();
    expect(await screen.findByText(/· Estudiantes$/)).toBeInTheDocument();
    expect(screen.getByText(/· Docentes tutores$/)).toBeInTheDocument();
  });

  it('la lista de estudiantes es la de siempre, y la coordinación ni siquiera ve la opción de docentes', async () => {
    renderPage('Administrador DBU', 'dbu-1', '/pedir-listas');
    expect(await screen.findByLabelText('Qué lista pedir')).toHaveValue('ESTUDIANTES');
  });

  it('una coordinación que llega con ?lista=docentes sigue pidiendo estudiantes, sin selector', async () => {
    renderPage('Coordinador', 'coord-1', '/pedir-listas?lista=docentes');

    await screen.findByText('registros@untrm.edu.pe');
    expect(screen.queryByLabelText('Qué lista pedir')).not.toBeInTheDocument();
  });
});
