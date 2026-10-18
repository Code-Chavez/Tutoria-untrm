import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { MyTutoringRequestPage } from './MyTutoringRequestPage';
import { tutoringRequestService } from '../services/tutoringRequestService';
import { periodService } from '@features/periodo/services/periodService';
import type { TutoringRequest, TutoringRequestView } from '../services/tutoringRequestService';

vi.mock('../services/tutoringRequestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tutoringRequestService')>();
  return {
    ...actual,
    tutoringRequestService: {
      createOwnTutoringRequest: vi.fn(),
      getOwn: vi.fn(),
      getRecipient: vi.fn(),
    },
  };
});

vi.mock('@features/periodo/services/periodService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@features/periodo/services/periodService')>();
  return { ...actual, periodService: { current: vi.fn() } };
});

const mocked = vi.mocked(tutoringRequestService);
const mockedPeriod = vi.mocked(periodService);

const view = (over: Partial<TutoringRequestView> = {}): TutoringRequestView => ({
  id: 'r1',
  studentId: 's1',
  source: 'STUDENT',
  caseType: 'ACADEMIC',
  reason: 'Dificultad en Cálculo',
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

const auth: AuthContextValue = {
  user: { id: 'u1', email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Torres', role: 'Tutorado' },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  markPasswordChanged: vi.fn(),
};

const renderPage = () =>
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientTestWrapper>
        <MyTutoringRequestPage />
      </QueryClientTestWrapper>
    </AuthContext.Provider>,
  );

describe('MyTutoringRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getOwn.mockResolvedValue([]);
    mockedPeriod.current.mockResolvedValue({ open: true, period: { id: 'p1', name: '2026-II', startDate: '2026-08-24', endDate: '2026-12-18' }, enrolled: true });
  });

  it('exige describir el motivo antes de enviar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(await screen.findByText(/describe el motivo/i)).toBeInTheDocument();
    expect(mocked.createOwnTutoringRequest).not.toHaveBeenCalled();
  });

  it('registra la solicitud y muestra a quién se enrutó', async () => {
    mocked.createOwnTutoringRequest.mockResolvedValue({
      id: 'req-1',
      studentId: 's1',
      source: 'STUDENT',
      caseType: 'ACADEMIC',
      reason: 'Dificultad en Cálculo',
      routedToId: 'tutor-1',
      routedToRole: 'tutor',
      createdAt: new Date().toISOString(),
    } as TutoringRequest);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/descripción del motivo/i), 'Dificultad en Cálculo');
    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    await waitFor(() => {
      expect(mocked.createOwnTutoringRequest).toHaveBeenCalledWith({
        caseType: 'ACADEMIC',
        reason: 'Dificultad en Cálculo',
      });
    });
    expect(await screen.findByText(/enrutada a tu tutor/i)).toBeInTheDocument();
    // Tras registrar, el historial se vuelve a pedir para que aparezca la nueva solicitud.
    await waitFor(() => expect(mocked.getOwn.mock.calls.length).toBeGreaterThan(1));
  });

  describe('a quién llega mi solicitud (U02)', () => {
    const created = { id: 'req-1', studentId: 's1', source: 'STUDENT', caseType: 'ACADEMIC', reason: 'x', routedToId: 't', routedToRole: 'tutor', createdAt: new Date().toISOString() } as TutoringRequest;

    it('antes de enviar dice quién la recibirá, con su nombre', async () => {
      mocked.getRecipient.mockResolvedValue({ kind: 'tutor', name: 'Elena Ramírez' });
      renderPage();
      expect(await screen.findByText('Tu solicitud la recibirá tu tutor Elena Ramírez. Te avisaremos en el sistema cuando responda.')).toBeInTheDocument();
    });

    it('sin tutor explica quién la recibe y no deja al estudiante sin saber qué hacer', async () => {
      mocked.getRecipient.mockResolvedValue({ kind: 'coordinator', name: 'Rosa Mendoza' });
      renderPage();
      expect(await screen.findByText(/Aún no tienes tutor asignado: tu solicitud la recibirá la coordinación de tu escuela \(Rosa Mendoza\)/)).toBeInTheDocument();
    });

    it('después de enviar nombra a quien la recibió', async () => {
      mocked.getRecipient.mockResolvedValue({ kind: 'tutor', name: 'Elena Ramírez' });
      mocked.createOwnTutoringRequest.mockResolvedValue(created);
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(/Tu solicitud la recibirá tu tutor Elena Ramírez/);

      await user.type(screen.getByLabelText(/descripción del motivo/i), 'Dificultad en Cálculo');
      await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

      expect(await screen.findByText('Solicitud registrada: la recibió tu tutor Elena Ramírez. Te avisaremos en el sistema cuando responda.')).toBeInTheDocument();
    });
  });

  it('muestra el historial con el estado y la respuesta recibida (R01)', async () => {
    mocked.getOwn.mockResolvedValue([
      view({ id: 'a', status: 'PENDIENTE' }),
      view({ id: 'b', caseType: 'PSYCHOLOGICAL', reason: 'Ansiedad antes de exámenes', status: 'ATENDIDA', responseNote: 'Te espero el jueves a las 10:00.', handledByName: 'Elena Ramírez' }),
    ]);
    renderPage();

    expect(await screen.findByText('Mis solicitudes')).toBeInTheDocument();
    expect(await screen.findByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Atendida')).toBeInTheDocument();
    expect(screen.getByText(/Te espero el jueves a las 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/Respuesta de Elena Ramírez/)).toBeInTheDocument();
  });

  it('sin solicitudes lo dice', async () => {
    renderPage();
    expect(await screen.findByText('Aún no has registrado solicitudes.')).toBeInTheDocument();
  });

  describe('ayuda para redactar (A11)', () => {
    it('muestra quién solicita', () => {
      renderPage();

      expect(screen.getByText(/Solicitas como/)).toHaveTextContent('Ana Torres');
      expect(screen.getByText(/Solicitas como/)).toHaveTextContent('ana@untrm.edu.pe');
    });

    it('ofrece frases de ejemplo según el motivo y las inserta en el cuadro, editables', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /Tengo dificultades con el curso de/ }));

      const box = screen.getByLabelText('Descripción del motivo') as HTMLTextAreaElement;
      expect(box.value).toBe('Tengo dificultades con el curso de ');
      await user.type(box, 'Cálculo II');
      expect(box.value).toBe('Tengo dificultades con el curso de Cálculo II');
    });

    it('al cambiar el motivo cambian los ejemplos', async () => {
      const user = userEvent.setup();
      renderPage();
      expect(screen.queryByRole('button', { name: /situación de salud/ })).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/Motivo/), 'HEALTH');

      expect(screen.getByRole('button', { name: /Necesito orientación sobre una situación de salud/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tengo dificultades con el curso de/ })).not.toBeInTheDocument();
    });

    it('si ya hay texto, el ejemplo se agrega en otra línea sin borrar lo escrito', async () => {
      const user = userEvent.setup();
      renderPage();
      const box = screen.getByLabelText('Descripción del motivo') as HTMLTextAreaElement;
      await user.type(box, 'Hola');

      await user.click(screen.getByRole('button', { name: /Quisiera apoyo para mejorar mi rendimiento en/ }));

      expect(box.value).toBe('Hola' + String.fromCharCode(10) + 'Quisiera apoyo para mejorar mi rendimiento en ');
    });

    it('un ejemplo solo no basta para enviar: hay que completarlo (no manda texto prellenado sin querer)', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

      expect(await screen.findByText('Describe el motivo de la solicitud.')).toBeInTheDocument();
      expect(mocked.createOwnTutoringRequest).not.toHaveBeenCalled();
    });
  });

  describe('periodo cerrado: solo lectura', () => {
    it('explica que no se puede solicitar y deshabilita el formulario, pero deja ver el historial', async () => {
      mockedPeriod.current.mockResolvedValue({ open: false, period: null, enrolled: null });
      mocked.getOwn.mockResolvedValue([view()]);
      renderPage();

      expect(await screen.findByText(/No hay un periodo académico abierto/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /registrar solicitud/i })).toBeDisabled();
      expect(screen.getByLabelText('Descripción del motivo')).toBeDisabled();
      expect(screen.getByLabelText(/Motivo/)).toBeDisabled();
      expect(await screen.findByText('Dificultad en Cálculo')).toBeInTheDocument(); // historial visible
    });

    it('sin figurar en la carga del periodo vigente: explica, deshabilita y deja ver el historial', async () => {
      mockedPeriod.current.mockResolvedValue({ open: true, period: { id: 'p1', name: '2026-II', startDate: '2026-08-24', endDate: '2026-12-18' }, enrolled: false });
      mocked.getOwn.mockResolvedValue([view()]);
      renderPage();

      expect(await screen.findByText(/No figuras en la carga del periodo 2026-II/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /registrar solicitud/i })).toBeDisabled();
      expect(screen.getByLabelText('Descripción del motivo')).toBeDisabled();
      expect(await screen.findByText('Dificultad en Cálculo')).toBeInTheDocument();
    });

    it('con el periodo abierto el formulario funciona normalmente', async () => {
      renderPage();

      await waitFor(() => expect(mockedPeriod.current).toHaveBeenCalled());
      expect(screen.queryByText(/No hay un periodo académico abierto/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /registrar solicitud/i })).toBeEnabled();
    });
  });
});

