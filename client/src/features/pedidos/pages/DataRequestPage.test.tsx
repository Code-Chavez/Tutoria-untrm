import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { DataRequestPage } from './DataRequestPage';
import { dataRequestService, type DataRequest } from '../services/dataRequestService';
import { schoolService, type School } from '@features/tutorados/services/schoolService';

vi.mock('../services/dataRequestService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/dataRequestService')>()),
  dataRequestService: { list: vi.fn(), send: vi.fn(), markReceived: vi.fn(), setRequestEmail: vi.fn() },
}));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));

const requests = vi.mocked(dataRequestService);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Errores de axios con la forma que devuelve el servidor (409 de equivalencia, 422) o sin respuesta (se perdió).
const httpError = (status: number, data: Record<string, unknown>) => new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, statusText: '', data, headers: {}, config: {} as never });
const lostResponse = () => new AxiosError('Network Error', 'ERR_NETWORK');
const previous = (over: Record<string, unknown> = {}) => ({ id: 'prev-1', createdAt: '2026-10-28T12:00:00.000Z', status: 'ENVIADO', ...over });
const schoolsApi = vi.mocked(schoolService);

const school = (over: Partial<School> = {}): School => ({ cycleCount: 10, id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, coordinatorId: 'coord-1', requestEmail: 'registros@untrm.edu.pe', ...over });
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
    requests.send.mockResolvedValue({ request: record(), replayed: false });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');

    await user.click(screen.getByRole('button', { name: 'Quitar selección' }));
    await user.click(screen.getByLabelText('3'));
    await user.click(screen.getByLabelText('4'));
    await user.type(screen.getByLabelText(/Observaciones/), 'Con urgencia');
    await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [3, 4], note: 'Con urgencia', kind: 'ESTUDIANTES', operationId: expect.stringMatching(UUID), confirmDuplicateOf: undefined }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pedido enviado a registros@untrm.edu.pe');
  });

  it('marca todos por defecto y envía explícitamente los diez ciclos', async () => {
    requests.send.mockResolvedValue({ request: record(), replayed: false });
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeChecked());
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    await waitFor(() => expect(requests.send).toHaveBeenCalledWith({ schoolId: 's1', cycles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], note: undefined, kind: 'ESTUDIANTES', operationId: expect.stringMatching(UUID), confirmDuplicateOf: undefined }));
  });

  it('lee los ciclos de cada escuela y reinicia la selección al cambiarla', async () => {
    schoolsApi.getSchools.mockResolvedValue([school({ cycleCount: 12 }), school({ id: 's2', name: 'Otra escuela', cycleCount: 8 })]);
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    expect(screen.getByLabelText('12')).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar selección' }));
    await userEvent.selectOptions(screen.getByLabelText('Escuela profesional'), 's2');
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeChecked());
    expect(screen.queryByLabelText('12')).not.toBeInTheDocument();
  });

  it('sin selección impide enviar y permite recuperar todos los ciclos', async () => {
    renderPage();
    await screen.findByText('registros@untrm.edu.pe');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar selección' }));
    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).not.toBeChecked());
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled();
    expect(screen.getByText('Selecciona al menos un ciclo para enviar el pedido.')).toBeInTheDocument();
    expect(requests.send).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar todos' }));
    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeChecked());
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeEnabled();
  });

  it('si el correo no sale lo dice como error pero el pedido queda registrado', async () => {
    requests.send.mockResolvedValue({ request: record({ status: 'FALLIDO', error: 'MailNotConfiguredError' }), replayed: false });
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

  describe('LEV-R04: repetición, equivalencia y resultado incierto', () => {
    const sendOnce = async (user = userEvent.setup()) => {
      renderPage();
      await screen.findByText('registros@untrm.edu.pe');
      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));
      return user;
    };
    const idOf = (call: number) => (requests.send.mock.calls[call][0] as { operationId: string }).operationId;

    it('mientras envía, el botón queda deshabilitado y un segundo clic no envía otra vez', async () => {
      let finish: (v: { request: DataRequest; replayed: boolean }) => void = () => undefined;
      requests.send.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      renderPage();
      await screen.findByText('registros@untrm.edu.pe');

      await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
      await waitFor(() => expect(screen.getByRole('button', { name: /Enviar pedido/ })).toBeDisabled());
      fireEvent.submit(screen.getByRole('button', { name: /Enviar pedido/ }).closest('form') as HTMLFormElement);
      // Se deja pasar un instante: un segundo envío (p. ej. Enter con el botón ya deshabilitado) llegaría de forma asíncrona.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(requests.send).toHaveBeenCalledTimes(1);
      finish({ request: record(), replayed: false });
      expect(await screen.findByRole('alert')).toHaveTextContent('Pedido enviado');
    });

    it('si se pierde la respuesta, reintentar lo mismo conserva el identificador; tras un resultado, el siguiente pedido usa otro', async () => {
      requests.send.mockRejectedValueOnce(lostResponse()).mockResolvedValue({ request: record(), replayed: false });
      const user = await sendOnce();
      expect(await screen.findByRole('alert')).toHaveTextContent(/no se enviará dos veces/);

      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));
      await screen.findByText(/Pedido enviado a/);
      expect(idOf(1)).toBe(idOf(0));

      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));
      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(3));
      expect(idOf(2)).not.toBe(idOf(0));
    });

    it('si cambia lo que se envía después de un fallo sin respuesta, es otra operación y usa otro identificador', async () => {
      requests.send.mockRejectedValueOnce(lostResponse()).mockResolvedValue({ request: record(), replayed: false });
      const user = await sendOnce();
      await screen.findByRole('alert');

      await user.type(screen.getByLabelText(/Observaciones/), 'Otra nota');
      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
      expect(idOf(1)).not.toBe(idOf(0));
    });

    it('ante la advertencia de equivalencia identifica el pedido anterior; confirmar lo reenvía como operación nueva citando ese pedido', async () => {
      requests.send.mockRejectedValueOnce(httpError(409, { code: 'DUPLICATE_DATA_REQUEST', error: 'x', previous: previous() })).mockResolvedValue({ request: record(), replayed: false });
      const user = await sendOnce();

      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent(/Hace poco \(.*\) ya se hizo un pedido equivalente: enviado/);
      expect(requests.send).toHaveBeenCalledTimes(1);

      await user.click(within(dialog).getByRole('button', { name: 'Pedir de nuevo' }));

      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
      expect(requests.send).toHaveBeenLastCalledWith(expect.objectContaining({ confirmDuplicateOf: 'prev-1' }));
      expect(idOf(1)).not.toBe(idOf(0));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('si mientras el diálogo estaba abierto se registró otro equivalente, la confirmación no vale: se muestra el nuevo pedido', async () => {
      requests.send
        .mockRejectedValueOnce(httpError(409, { code: 'DUPLICATE_DATA_REQUEST', error: 'x', previous: previous() }))
        .mockRejectedValueOnce(httpError(409, { code: 'DUPLICATE_DATA_REQUEST', error: 'x', previous: previous({ id: 'prev-2', status: 'INCIERTO' }) }));
      const user = await sendOnce();
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Pedir de nuevo' }));

      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
      expect(await screen.findByRole('alertdialog')).toHaveTextContent(/envío incierto/);
      expect(requests.send).toHaveBeenLastCalledWith(expect.objectContaining({ confirmDuplicateOf: 'prev-1' }));

      requests.send.mockResolvedValue({ request: record(), replayed: false });
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Pedir de nuevo' }));
      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(3));
      expect(requests.send).toHaveBeenLastCalledWith(expect.objectContaining({ confirmDuplicateOf: 'prev-2' }));
    });

    it('confirmar el equivalente: mientras la petición sigue pendiente no se puede confirmar otra vez ni cerrar con Escape, y el diálogo se cierra solo cuando termina', async () => {
      let finish: (v: { request: DataRequest; replayed: boolean }) => void = () => undefined;
      requests.send
        .mockRejectedValueOnce(httpError(409, { code: 'DUPLICATE_DATA_REQUEST', error: 'x', previous: previous() }))
        .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
      const user = await sendOnce();
      const dialog = await screen.findByRole('alertdialog');
      await user.keyboard('{Tab}{Enter}'); // «Pedir de nuevo» con el teclado

      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'true'));
      expect(within(dialog).getByRole('button', { name: 'Pedir de nuevo' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();

      // Pendiente: ni Escape, ni Enter/Espacio, ni clic en el fondo, ni otro clic en «Pedir de nuevo» tienen efecto.
      await user.keyboard('{Escape}');
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      await user.click(within(dialog).getByRole('button', { name: 'Pedir de nuevo' }));
      await user.click(dialog.parentElement as HTMLElement);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(requests.send).toHaveBeenCalledTimes(2);

      // Solo al terminar la petición el diálogo se cierra (y deja de estar ocupado).
      finish({ request: record(), replayed: false });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(requests.send).toHaveBeenCalledTimes(2);
    });

    it('cancelar el diálogo no envía nada', async () => {
      requests.send.mockRejectedValueOnce(httpError(409, { code: 'DUPLICATE_DATA_REQUEST', error: 'x', previous: previous() }));
      const user = await sendOnce();

      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(requests.send).toHaveBeenCalledTimes(1);
    });

    it('un envío equivalente en curso no ofrece confirmar: avisa que hay que esperar su resultado', async () => {
      requests.send.mockRejectedValueOnce(httpError(409, { code: 'DATA_REQUEST_IN_FLIGHT', error: 'Hay un pedido equivalente enviándose en este momento. Espera su resultado antes de volver a pedirlo.', previous: previous({ status: 'PENDIENTE' }) }));
      await sendOnce();

      expect(await screen.findByRole('alert')).toHaveTextContent(/enviándose en este momento/);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('un identificador reutilizado con otros datos (422) muestra el mensaje y la siguiente operación usa otro identificador', async () => {
      requests.send.mockRejectedValueOnce(httpError(422, { code: 'OPERATION_ID_CONFLICT', error: 'El identificador de la operación ya se usó con otros datos. Vuelve a preparar el pedido.' })).mockResolvedValue({ request: record(), replayed: false });
      const user = await sendOnce();
      expect(await screen.findByRole('alert')).toHaveTextContent(/ya se usó con otros datos/);

      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

      await waitFor(() => expect(requests.send).toHaveBeenCalledTimes(2));
      expect(idOf(1)).not.toBe(idOf(0));
    });

    it('una repetición lo dice y un resultado incierto no se presenta como enviado', async () => {
      requests.send.mockResolvedValueOnce({ request: record(), replayed: true }).mockResolvedValueOnce({ request: record({ status: 'INCIERTO' }), replayed: false });
      const user = await sendOnce();
      expect(await screen.findByRole('alert')).toHaveTextContent(/ya estaba registrado y enviado.*no se envió otro correo/);

      await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

      expect(await screen.findByText(/no se puede saber si el correo salió/)).toBeInTheDocument();
      expect(screen.queryByText(/Pedido enviado a/)).not.toBeInTheDocument();
    });

    it('el historial distingue enviándose y envío incierto, sin ofrecer marcarlos como recibidos', async () => {
      requests.list.mockResolvedValue([record({ id: 'r1', status: 'PENDIENTE' }), record({ id: 'r2', status: 'INCIERTO' })]);
      renderPage();

      expect(await screen.findByText('Enviándose')).toBeInTheDocument();
      expect(screen.getByText('Envío incierto')).toBeInTheDocument();
      expect(screen.getByText(/Verifica con la escuela antes de volver a pedirlo/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Marcar como recibido' })).not.toBeInTheDocument();
    });
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
    expect(screen.queryByRole('group', { name: 'Ciclos a solicitar' })).not.toBeInTheDocument();
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
