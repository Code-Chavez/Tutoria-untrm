import { act, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError } from 'axios';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingPage } from './PendingPage';
import { pendingService, type DeclineNotice, type PendingItem } from '../services/pendingService';

vi.mock('../services/pendingService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/pendingService')>()),
  pendingService: { list: vi.fn(), resendDeclineNotice: vi.fn() },
}));
const mocked = vi.mocked(pendingService);

const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const item = (over: Partial<PendingItem>): PendingItem => ({
  kind: 'DESIGNATION_REJECTED',
  schoolId: 'sys',
  schoolName: 'Ingeniería de Sistemas',
  cycle: 3,
  title: 'Elena Ramírez rechazó la tutoría del ciclo 3 de Ingeniería de Sistemas',
  detail: 'Motivo: Licencia por salud',
  since: day(5),
  link: '/asignacion',
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PendingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PendingPage (pendientes institucionales)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin pendientes lo dice con claridad', async () => {
    mocked.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay pendientes')).toBeInTheDocument();
  });

  it('muestra qué pasó, dónde, desde cuándo y a dónde ir a resolverlo', async () => {
    mocked.list.mockResolvedValue([
      item({}),
      item({ kind: 'CANCELLED_SESSION_NO_FOLLOWUP', cycle: 3, title: 'Se canceló la cita de la solicitud de Ana Torres', detail: 'Motivo de la cancelación: Paro.', since: day(1), link: '/solicitudes?solicitud=r1' }),
    ]);
    renderPage();
    expect(await screen.findByText(/rechazó la tutoría del ciclo 3/)).toBeInTheDocument();
    expect(screen.getByText('Motivo: Licencia por salud')).toBeInTheDocument();
    expect(screen.getByText(/Ingeniería de Sistemas · ciclo 3 · desde hace 5 días/)).toBeInTheDocument();
    expect(screen.getByText(/desde hace 1 día/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a «Asignación por ciclo»' })).toHaveAttribute('href', '/asignacion');
    expect(screen.getByRole('link', { name: 'Abrir la solicitud' })).toHaveAttribute('href', '/solicitudes?solicitud=r1');
  });

  it('se puede filtrar por tipo y los conteos salen de lo que hay', async () => {
    mocked.list.mockResolvedValue([item({}), item({ kind: 'CYCLE_WITHOUT_TUTOR', title: 'Ciclo 5: 12 estudiantes sin tutor', detail: 'x', cycle: 5 })]);
    const user = userEvent.setup();
    renderPage();
    const select = await screen.findByLabelText('Tipo de pendiente');
    expect(screen.getByRole('option', { name: 'Todos (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ciclo sin tutor (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Cita cancelada/ })).not.toBeInTheDocument(); // no hay de ese tipo

    await user.selectOptions(select, 'CYCLE_WITHOUT_TUTOR');
    expect(screen.getByText('Ciclo 5: 12 estudiantes sin tutor')).toBeInTheDocument();
    expect(screen.queryByText(/rechazó la tutoría/)).not.toBeInTheDocument();
  });

  it('combina búsqueda sin tildes y escuela, informa sin coincidencias y permite limpiar', async () => {
    mocked.list.mockResolvedValue([
      item({}),
      item({ schoolId: 'adm', schoolName: 'Administración', title: 'Ciclo sin docente', kind: 'CYCLE_WITHOUT_TUTOR' }),
    ]);
    const user = userEvent.setup();
    renderPage();
    const search = await screen.findByLabelText('Buscar pendiente');
    await user.type(search, 'ramirez');
    expect(screen.getByRole('status')).toHaveTextContent('1 de 2 pendientes');
    await user.selectOptions(screen.getByLabelText('Escuela profesional'), 'adm');
    expect(screen.getByText('No hay coincidencias')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pendientes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('2 de 2 pendientes');
    expect(screen.getByRole('region', { name: 'Resultados de pendientes' })).toHaveAttribute('tabindex', '0');
  });

  it('si no se pueden cargar lo dice (no queda una pantalla vacía que parezca «sin pendientes»)', async () => {
    mocked.list.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('No se pudieron cargar los pendientes')).toBeInTheDocument();
    expect(screen.queryByText('No hay pendientes')).not.toBeInTheDocument();
  });

  describe('aviso por correo del rechazo (LEV-R05)', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const notice = (over: Partial<DeclineNotice> = {}): DeclineNotice => ({
      status: 'FALLIDO',
      attemptId: '11111111-1111-4111-8111-111111111111',
      kind: 'ORIGINAL',
      at: '2026-10-28T15:00:00.000Z',
      recipientName: 'Rosa Mendoza',
      deliveryEnabled: true,
      canResend: true,
      needsConfirmation: false,
      ...over,
    });
    const withNotice = (over: Partial<DeclineNotice> = {}) => mocked.list.mockResolvedValue([item({ notice: notice(over) })]);
    const outcome = (status: string) => ({ attempt: { id: 'n2', status, kind: 'REENVIO', at: '2026-10-28T16:00:00.000Z', recipientName: 'Rosa Mendoza' }, replayed: false }) as never;
    const httpError = (status: number, data: Record<string, unknown>) => new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, statusText: '', data, headers: {}, config: {} as never });
    const lost = () => new AxiosError('Network Error', 'ERR_NETWORK');
    const idOf = (call: number) => (mocked.resendDeclineNotice.mock.calls[call][2] as { operationId: string }).operationId;

    it.each([
      ['ENVIADO', { status: 'ENVIADO', canResend: false }, /El servidor de correo aceptó el aviso a Rosa Mendoza\. Eso no garantiza que haya llegado/],
      ['FALLIDO', { status: 'FALLIDO' }, /El servidor de correo no aceptó el aviso a Rosa Mendoza\. Puede reenviarlo/],
      ['INCIERTO', { status: 'INCIERTO', needsConfirmation: true }, /No se puede saber si el aviso a Rosa Mendoza salió/],
      ['SIN_REGISTRO', { status: 'SIN_REGISTRO', attemptId: null, at: null, recipientName: null, needsConfirmation: true }, /anterior al registro de avisos: no se sabe si se envió/],
      ['SIN_DESTINATARIO', { status: 'SIN_DESTINATARIO', canResend: false }, /^No se realizó el envío porque no hay un destinatario habilitado\.$/],
      ['DATOS_INCOMPLETOS', { status: 'DATOS_INCOMPLETOS', canResend: false }, /faltan o son inconsistentes datos necesarios/],
      ['OBSOLETO', { status: 'OBSOLETO', canResend: false }, /ya no corresponde: la designación cambió/],
    ])('%s: dice solo lo que se sabe del envío', async (_name, change, expected) => {
      withNotice(change as Partial<DeclineNotice>);
      renderPage();

      const text = await screen.findByText(expected);

      expect(text).toBeInTheDocument();
      // Nunca afirma que alguien fue avisado ni que nadie recibió el correo.
      expect(document.body.textContent).not.toMatch(/se avisó|nadie recibió/i);
    });

    it('sin envío de correo configurado explica la causa y el siguiente paso, y no ofrece reenviar ni lo presenta como espera normal', async () => {
      withNotice({ status: 'EN_COLA', deliveryEnabled: false, canResend: false, attemptId: 'n1' });
      renderPage();

      const text = await screen.findByText(/no se envió porque el envío de correos no está configurado/);

      expect(text).toHaveTextContent(/Queda en espera y saldrá solo cuando se configure el correo \(SMTP\)\. Siguiente paso: pida a la administración que lo configure\./);
      expect(screen.queryByRole('button', { name: 'Reenviar aviso' })).not.toBeInTheDocument();
    });

    it('con el envío configurado, un aviso en cola no se presenta como enviado y sugiere avisar si tarda', async () => {
      withNotice({ status: 'EN_COLA', canResend: false });
      renderPage();

      expect(await screen.findByText(/en la cola de envío y aún no se ha intentado/)).toBeInTheDocument();
      expect(screen.queryByText(/aceptó el aviso/)).not.toBeInTheDocument();
    });

    it('un FALLIDO se reenvía con un clic, con identidad de operación; el rechazo no cambia y el mensaje no promete más de lo aceptado', async () => {
      withNotice();
      mocked.resendDeclineNotice.mockResolvedValue(outcome('ENVIADO'));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));

      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledWith('sys', 3, { operationId: expect.stringMatching(UUID), confirmPrevious: undefined }));
      expect(await screen.findByText(/El servidor de correo aceptó el aviso a Rosa Mendoza\. Eso no garantiza que haya llegado a su bandeja\.$/)).toBeInTheDocument();
    });

    it('si se pierde la respuesta, reintentar conserva el identificador; tras una respuesta definitiva, el siguiente reenvío usa otro', async () => {
      withNotice();
      mocked.resendDeclineNotice.mockRejectedValueOnce(lost()).mockResolvedValue(outcome('FALLIDO'));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/no se enviará dos veces/);

      await user.click(screen.getByRole('button', { name: 'Reenviar aviso' }));
      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledTimes(2));
      expect(idOf(1)).toBe(idOf(0));

      await user.click(screen.getByRole('button', { name: 'Reenviar aviso' }));
      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledTimes(3));
      expect(idOf(2)).not.toBe(idOf(0));
    });

    it('un resultado incierto abre un diálogo que identifica el intento anterior; confirmar reenvía confirmando ESE intento; cancelar no envía', async () => {
      withNotice({ status: 'INCIERTO', needsConfirmation: true });
      mocked.resendDeclineNotice.mockResolvedValue(outcome('ENVIADO'));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent(/No se puede saber si el aviso anterior \(.*\) salió.*dos veces.*el rechazo del docente no cambia/);
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(mocked.resendDeclineNotice).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Reenviar aviso' }));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reenviar aviso' }));

      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledWith('sys', 3, { operationId: expect.stringMatching(UUID), confirmPrevious: { attemptId: '11111111-1111-4111-8111-111111111111' } }));
    });

    it('un rechazo sin registro previo se confirma como «sin registro» (attemptId nulo)', async () => {
      withNotice({ status: 'SIN_REGISTRO', attemptId: null, at: null, recipientName: null, needsConfirmation: true });
      mocked.resendDeclineNotice.mockResolvedValue(outcome('ENVIADO'));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reenviar aviso' }));

      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledWith('sys', 3, expect.objectContaining({ confirmPrevious: { attemptId: null } })));
    });

    it('si el intento mostrado ya no es el último, el servidor responde con el actual y la confirmación antigua no vale', async () => {
      withNotice({ status: 'INCIERTO', needsConfirmation: true });
      const newer = '22222222-2222-4222-8222-222222222222';
      mocked.resendDeclineNotice
        .mockRejectedValueOnce(httpError(409, { code: 'CONFIRMATION_REQUIRED', error: 'x', previous: { attemptId: newer, status: 'INCIERTO', at: '2026-10-28T17:00:00.000Z' } }))
        .mockResolvedValue(outcome('ENVIADO'));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reenviar aviso' }));

      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledTimes(1));
      expect(await screen.findByRole('alertdialog')).toHaveTextContent(/\(28 oct. 2026.*\)/);
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reenviar aviso' }));

      await waitFor(() => expect(mocked.resendDeclineNotice).toHaveBeenCalledTimes(2));
      expect(mocked.resendDeclineNotice).toHaveBeenLastCalledWith('sys', 3, expect.objectContaining({ confirmPrevious: { attemptId: newer } }));
      expect(idOf(1)).not.toBe(idOf(0));
    });

    it('un envío en curso o un aviso ya aceptado muestran el mensaje del servidor, sin diálogo', async () => {
      withNotice();
      mocked.resendDeclineNotice.mockRejectedValue(httpError(409, { code: 'DECLINE_NOTICE_IN_FLIGHT', error: 'El aviso se está enviando en este momento. Espere su resultado antes de reenviarlo.', previous: { attemptId: 'n9', status: 'ENVIANDO', at: null } }));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Reenviar aviso' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/se está enviando en este momento/);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('dos clics seguidos (antes de que la pantalla se redibuje) no envían dos veces', async () => {
      withNotice();
      let finish: (v: never) => void = () => undefined;
      mocked.resendDeclineNotice.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      renderPage();
      const button = await screen.findByRole('button', { name: 'Reenviar aviso' });

      act(() => {
        button.click();
        button.click();
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mocked.resendDeclineNotice).toHaveBeenCalledTimes(1);
      finish(outcome('ENVIADO'));
    });

    it('no muestra datos técnicos: ni códigos de error ni correos', async () => {
      withNotice({ status: 'FALLIDO' });
      renderPage();

      await screen.findByText(/no aceptó el aviso/);

      expect(document.body.textContent).not.toMatch(/ECONN|ESOCKET|SendTimeout|@untrm|errorCode/);
    });
  });
});
