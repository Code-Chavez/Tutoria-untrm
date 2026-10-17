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

  it('el filtro por estado vuelve a consultar con ese estado', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Torres');
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'ATENDIDA');
    await waitFor(() => expect(mocked.getInbox).toHaveBeenLastCalledWith('ATENDIDA'));
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
    renderPage();
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
});
