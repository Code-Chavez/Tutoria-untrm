import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { TutoringRequestsInboxPage } from './TutoringRequestsInboxPage';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { studentService } from '@features/tutorados/services/studentService';
import { sessionService } from '@features/sesiones/services/sessionService';
import { referralService } from '@features/derivaciones/services/referralService';
import { tutoringRequestService } from '../services/tutoringRequestService';
import type { TutoringRequestView } from '../services/tutoringRequestService';

vi.mock('@features/tutorados/services/studentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@features/tutorados/services/studentService')>();
  return { ...actual, studentService: { getStudents: vi.fn() } };
});
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/asignacion/services/assignmentService', () => ({ assignmentService: { getTutorWorkload: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/sesiones/services/sessionService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@features/sesiones/services/sessionService')>();
  return { ...actual, sessionService: { scheduleSession: vi.fn() } };
});
vi.mock('@features/derivaciones/services/referralService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@features/derivaciones/services/referralService')>();
  return { ...actual, referralService: { createReferral: vi.fn() } };
});

vi.mock('../services/tutoringRequestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tutoringRequestService')>();
  return { ...actual, tutoringRequestService: { getInbox: vi.fn(), updateStatus: vi.fn() } };
});
const mocked = vi.mocked(tutoringRequestService);

const request = (over: Partial<TutoringRequestView> = {}): TutoringRequestView => ({
  id: 'r1',
  studentId: 's1',
  source: 'STUDENT',
  caseType: 'ACADEMIC',
  reason: 'Necesito apoyo en Cálculo',
  routedToId: 'tutor-1',
  routedToRole: 'tutor',
  status: 'PENDIENTE',
  responseNote: null,
  handledById: null,
  handledAt: null,
  sessionId: null,
  referralId: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  studentName: 'Ana Torres',
  studentCode: '20191234',
  routedToName: 'Elena Ramírez',
  handledByName: null,
  ...over,
});

const ana = { id: 's1', studentCode: '20191234', firstName: 'Ana', lastName: 'Torres', cycle: 5, isAtRisk: false, isActive: true, schoolId: 'sc1' };
const authAs = (role: string): AuthContextValue => ({
  user: { id: 'u1', email: 'elena@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez', role },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  markPasswordChanged: vi.fn(),
});

const renderPage = (url = '/solicitudes', role = 'Docente Tutor') =>
  render(
    <AuthContext.Provider value={authAs(role)}>
      <MemoryRouter initialEntries={[url]}>
        <QueryClientTestWrapper>
          <TutoringRequestsInboxPage />
        </QueryClientTestWrapper>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('TutoringRequestsInboxPage (R01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear(); // los borradores viven en la pestaña: que no pasen de una prueba a otra
    mocked.getInbox.mockResolvedValue([request()]);
    vi.mocked(studentService.getStudents).mockResolvedValue([ana]);
  });

  it('lista las solicitudes con tutorado, tipo, motivo, destinatario y estado', async () => {
    renderPage();
    const row = within(await screen.findByRole('row', { name: /Ana Torres/ }));
    expect(row.getByText('20191234')).toBeInTheDocument();
    expect(row.getByText('Académico')).toBeInTheDocument();
    expect(row.getByText('Necesito apoyo en Cálculo')).toBeInTheDocument();
    expect(row.getByText('Elena Ramírez')).toBeInTheDocument();
    expect(row.getByText('Pendiente')).toBeInTheDocument();
  });

  it('el filtro por estado cambia la vista sin volver a consultar (se trae todo una vez)', async () => {
    mocked.getInbox.mockResolvedValue([request(), request({ id: 'r9', studentName: 'Luis Pérez', status: 'ATENDIDA', responseNote: 'Listo' })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Torres');
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument(); // lo atendido no tapa lo pendiente

    await user.click(screen.getByRole('button', { name: /Atendidas/ }));
    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Torres')).not.toBeInTheDocument();
    expect(mocked.getInbox).toHaveBeenCalledTimes(1);
    expect(mocked.getInbox).toHaveBeenCalledWith(undefined);
  });

  it('pasa la solicitud a en atención', async () => {
    mocked.updateStatus.mockResolvedValue(request({ status: 'EN_ATENCION' }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Atender' }));
    await user.click(screen.getByRole('button', { name: 'Pasar a en atención' }));
    await waitFor(() => expect(mocked.updateStatus).toHaveBeenCalledWith('r1', { status: 'EN_ATENCION', note: undefined }));
  });

  it('atenderla exige la respuesta y luego la envía', async () => {
    mocked.updateStatus.mockResolvedValue(request({ status: 'ATENDIDA' }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Atender' }));

    await user.click(screen.getByRole('button', { name: 'Marcar atendida' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe la respuesta');
    expect(mocked.updateStatus).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Respuesta para el estudiante'), 'Te espero el jueves.');
    await user.click(screen.getByRole('button', { name: 'Marcar atendida' }));
    await waitFor(() => expect(mocked.updateStatus).toHaveBeenCalledWith('r1', { status: 'ATENDIDA', note: 'Te espero el jueves.' }));
  });

  it('una solicitud atendida se consulta (con la respuesta) pero no se vuelve a modificar', async () => {
    mocked.getInbox.mockResolvedValue([request({ status: 'ATENDIDA', responseNote: 'Listo', handledByName: 'Elena Ramírez' })]);
    const user = userEvent.setup();
    renderPage('/solicitudes?estado=atendidas');
    await user.click(await screen.findByRole('button', { name: 'Ver' }));
    expect(await screen.findByText(/Atendida por Elena Ramírez/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar atendida' })).not.toBeInTheDocument();
  });

  it('sin solicitudes explica qué verás aquí', async () => {
    mocked.getInbox.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Aún no hay solicitudes')).toBeInTheDocument();
  });

  it('con ?solicitud=<id> (desde un aviso) abre esa solicitud', async () => {
    renderPage('/solicitudes?solicitud=r1');
    expect(await screen.findByRole('dialog', { name: 'Atender solicitud de tutoría' })).toBeInTheDocument();
    expect(screen.getByText('Solicitud de Ana Torres')).toBeInTheDocument();
  });

  it('si la solicitud del aviso ya no está disponible, lo explica', async () => {
    renderPage('/solicitudes?solicitud=otra');
    expect(await screen.findByRole('status')).toHaveTextContent('ya no está disponible para tu cuenta');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('la respuesta a medio escribir no se pierde (U07)', () => {
    it('si cierra la ventana sin querer, al volver a abrir la solicitud recupera lo escrito', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      await user.type(screen.getByLabelText('Respuesta para el estudiante'), 'Te espero el jueves');
      await user.click(screen.getByRole('button', { name: 'Cerrar' })); // cierra sin guardar

      await user.click(screen.getByRole('button', { name: 'Atender' }));
      expect(screen.getByLabelText('Respuesta para el estudiante')).toHaveValue('Te espero el jueves');
      expect(screen.getByText(/Recuperamos lo que habías escrito/)).toBeInTheDocument();
    });

    it('al guardar la respuesta no queda borrador', async () => {
      mocked.updateStatus.mockResolvedValue(request({ status: 'ATENDIDA' }));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      await user.type(screen.getByLabelText('Respuesta para el estudiante'), 'Listo');
      await user.click(screen.getByRole('button', { name: 'Marcar atendida' }));
      await waitFor(() => expect(mocked.updateStatus).toHaveBeenCalled());
      await waitFor(() => expect(Object.keys(window.sessionStorage).filter((k) => k.startsWith('sit.draft.'))).toEqual([]));
    });
  });

  describe('continuidad: de la solicitud a la sesión o la derivación (U01)', () => {
    it('el docente tutor ve «Programar sesión» y «Derivar a un servicio»; quien no programa ni deriva, no', async () => {
      const user = userEvent.setup();
      const first = renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      expect(screen.getByRole('button', { name: 'Programar sesión' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Derivar a un servicio' })).toBeInTheDocument();
      first.unmount();

      renderPage('/solicitudes', 'Coordinador');
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      expect(screen.queryByRole('button', { name: 'Programar sesión' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Derivar a un servicio' })).not.toBeInTheDocument();
    });

    it('programar la sesión parte de la solicitud: tutorado y motivo ya vienen, y la sesión se crea vinculada a ella', async () => {
      vi.mocked(sessionService.scheduleSession).mockResolvedValue({ id: 'ses1', scheduledAt: '2026-10-22T15:00:00.000Z' } as never);
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      await user.click(screen.getByRole('button', { name: 'Programar sesión' }));

      const dialog = await screen.findByRole('dialog', { name: 'Programar sesión de tutoría' });
      expect(within(dialog).getByText(/Ana Torres · 20191234/)).toBeInTheDocument();
      expect(within(dialog).getByText(/Atiende la solicitud de Ana Torres/)).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Tema de la sesión')).toHaveValue('Necesito apoyo en Cálculo');

      await user.type(within(dialog).getByLabelText('Fecha'), '2026-10-22');
      await user.type(within(dialog).getByLabelText('Hora'), '10:00');
      await user.type(within(dialog).getByLabelText('Lugar'), 'Oficina 204');
      await user.click(within(dialog).getByRole('button', { name: 'Programar sesión' }));

      await waitFor(() =>
        expect(sessionService.scheduleSession).toHaveBeenCalledWith(
          expect.objectContaining({ studentIds: ['s1'], topic: 'Necesito apoyo en Cálculo', location: 'Oficina 204', tutoringRequestId: 'r1' }),
        ),
      );
      expect(await screen.findByText(/Sesión programada para el .* con Ana Torres\. Quedó vinculada a su solicitud/)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('derivar parte de la solicitud: el motivo ya viene y la derivación se crea vinculada a ella', async () => {
      vi.mocked(referralService.createReferral).mockResolvedValue({ id: 'ref1' } as never);
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      await user.click(screen.getByRole('button', { name: 'Derivar a un servicio' }));

      const dialog = await screen.findByRole('dialog', { name: 'Ficha de derivación' });
      expect(within(dialog).getByText(/Atiende la solicitud de Ana Torres/)).toBeInTheDocument();
      expect(within(dialog).getByDisplayValue('Necesito apoyo en Cálculo')).toBeInTheDocument();
      await user.click(within(dialog).getAllByRole('checkbox')[0]);
      await user.click(within(dialog).getByRole('button', { name: 'Derivar caso' }));

      await waitFor(() =>
        expect(referralService.createReferral).toHaveBeenCalledWith('s1', expect.objectContaining({ reason: 'Necesito apoyo en Cálculo', tutoringRequestId: 'r1' })),
      );
      expect(await screen.findByText(/Caso de Ana Torres derivado\. Quedó vinculado a su solicitud/)).toBeInTheDocument();
    });

    it('si el servidor la rechaza (p. ej. ya tiene sesión), el formulario sigue abierto y dice por qué', async () => {
      vi.mocked(sessionService.scheduleSession).mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'Esta solicitud ya tiene una sesión programada' } } }));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Atender' }));
      await user.click(screen.getByRole('button', { name: 'Programar sesión' }));
      const dialog = await screen.findByRole('dialog', { name: 'Programar sesión de tutoría' });
      await user.type(within(dialog).getByLabelText('Fecha'), '2026-10-22');
      await user.type(within(dialog).getByLabelText('Hora'), '10:00');
      await user.type(within(dialog).getByLabelText('Lugar'), 'Oficina 204');
      await user.click(within(dialog).getByRole('button', { name: 'Programar sesión' }));
      expect(await within(dialog).findByText(/ya tiene una sesión programada/)).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Programar sesión de tutoría' })).toBeInTheDocument();
    });

    it('una solicitud ya vinculada lo dice en la tabla y en el detalle, y no ofrece crear otra atención', async () => {
      mocked.getInbox.mockResolvedValue([
        request({ status: 'EN_ATENCION', sessionId: 'ses1' }),
        request({ id: 'r2', studentName: 'Luis Pérez', status: 'EN_ATENCION', referralId: 'ref1' }),
      ]);
      const user = userEvent.setup();
      renderPage();
      expect(await screen.findByText('Con sesión programada')).toBeInTheDocument();
      expect(screen.getByText('Derivada a un servicio')).toBeInTheDocument();
      await user.click(screen.getAllByRole('button', { name: 'Atender' })[0]);
      expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent('Con sesión programada: no hace falta crear otra atención');
      expect(screen.queryByRole('button', { name: 'Programar sesión' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Derivar a un servicio' })).not.toBeInTheDocument();
    });
  });

  describe('lo pendiente primero y a la vista (U04, U09)', () => {
    const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

    it('abre en «Por atender»: la pendiente más antigua primero, con cuánto lleva esperando, y las atendidas recientes no la tapan', async () => {
      mocked.getInbox.mockResolvedValue([
        request({ id: 'a1', studentName: 'Atendida Reciente', status: 'ATENDIDA', createdAt: ago(1) }),
        request({ id: 'a2', studentName: 'Atendida Ayer', status: 'ATENDIDA', createdAt: ago(2) }),
        request({ id: 'p1', studentName: 'Pendiente Reciente', status: 'PENDIENTE', createdAt: ago(3) }),
        request({ id: 'p2', studentName: 'Pendiente Antigua', status: 'PENDIENTE', createdAt: ago(25) }),
        request({ id: 'e1', studentName: 'En Atención', status: 'EN_ATENCION', createdAt: ago(10) }),
      ]);
      renderPage();

      await screen.findByText('Pendiente Antigua');
      const rows = screen.getAllByRole('row').slice(1); // sin el encabezado
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent('Pendiente Antigua');
      expect(rows[1]).toHaveTextContent('Pendiente Reciente');
      expect(rows[2]).toHaveTextContent('En Atención');
      expect(within(rows[0]).getByText('Espera desde hace 25 días')).toBeInTheDocument();
      expect(screen.queryByText('Atendida Reciente')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Por atender/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('cada vista muestra cuántas hay', async () => {
      mocked.getInbox.mockResolvedValue([request({ id: 'p1' }), request({ id: 'p2' }), request({ id: 'e1', status: 'EN_ATENCION' }), request({ id: 'a1', status: 'ATENDIDA' })]);
      renderPage();
      await screen.findAllByRole('row');
      expect(screen.getByRole('button', { name: 'Por atender 3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pendientes 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'En atención 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atendidas 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Todas 4' })).toBeInTheDocument();
    });

    it('con ?estado=pendientes (un contador del inicio) abre ya filtrada; un valor desconocido cae en «Por atender»', async () => {
      mocked.getInbox.mockResolvedValue([request({ id: 'p1', studentName: 'Sofía Rojas' }), request({ id: 'e1', studentName: 'Pedro Campos', status: 'EN_ATENCION' })]);
      const first = renderPage('/solicitudes?estado=pendientes');
      expect(await screen.findByText('Sofía Rojas')).toBeInTheDocument();
      expect(screen.queryByText('Pedro Campos')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pendientes/ })).toHaveAttribute('aria-pressed', 'true');
      first.unmount();

      renderPage('/solicitudes?estado=inventado');
      expect(await screen.findByText('Pedro Campos')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Por atender/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('busca por estudiante, código o motivo sin importar tildes', async () => {
      mocked.getInbox.mockResolvedValue([
        request({ id: 'p1', studentName: 'Ana Torres', reason: 'Dificultad en Álgebra' }),
        request({ id: 'p2', studentName: 'Luis Pérez', studentCode: '20201111', reason: 'Horario cruzado' }),
      ]);
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Ana Torres');

      await user.type(screen.getByLabelText('Buscar solicitud'), 'algebra');
      expect(screen.getByText('Ana Torres')).toBeInTheDocument();
      expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument();

      await user.clear(screen.getByLabelText('Buscar solicitud'));
      await user.type(screen.getByLabelText('Buscar solicitud'), 'zzzz');
      expect(await screen.findByText('Ninguna solicitud coincide con la búsqueda')).toBeInTheDocument();
    });

    it('si no hay nada por atender lo dice y ofrece ver todas, en vez de una pantalla vacía sin explicación', async () => {
      mocked.getInbox.mockResolvedValue([request({ status: 'ATENDIDA', responseNote: 'Listo' })]);
      const user = userEvent.setup();
      renderPage();
      expect(await screen.findByText('No hay solicitudes por atender')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ver todas' }));
      expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
    });

    it('un aviso abre su solicitud aunque ya esté atendida y fuera de la vista actual; cerrar conserva el filtro', async () => {
      mocked.getInbox.mockResolvedValue([request({ id: 'r1', status: 'ATENDIDA', responseNote: 'Listo' })]);
      const user = userEvent.setup();
      renderPage('/solicitudes?estado=pendientes&solicitud=r1');
      expect(await screen.findByRole('dialog', { name: 'Atender solicitud de tutoría' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pendientes/ })).toHaveAttribute('aria-pressed', 'true'); // el filtro no se perdió
    });
  });
});
