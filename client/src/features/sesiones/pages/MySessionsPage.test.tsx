import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { MySessionsPage } from './MySessionsPage';
import { sessionService, type TutoringSession } from '../services/sessionService';
import { tutoringRequestService, type TutoringRequestView } from '@features/solicitudes/services/tutoringRequestService';

vi.mock('../services/sessionService', () => ({ sessionService: { getOwnSessions: vi.fn() } }));
vi.mock('@features/solicitudes/services/tutoringRequestService', () => ({ tutoringRequestService: { getOwn: vi.fn() } }));
const mocked = vi.mocked(sessionService);
const mockedRequests = vi.mocked(tutoringRequestService);

const day = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();

const session = (over: Partial<TutoringSession>): TutoringSession =>
  ({
    id: 's',
    topic: 'Tema',
    scheduledAt: day(2),
    endsAt: day(2),
    durationMinutes: 45,
    modality: 'PRESENCIAL',
    location: 'Aula 12',
    meetingLink: null,
    attendedStudentIds: [],
    absentStudentIds: [],
    cancelledAt: null,
    cancelReason: null,
    ...over,
  }) as TutoringSession;

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <MemoryRouter>
        <MySessionsPage />
      </MemoryRouter>
    </QueryClientTestWrapper>,
  );

describe('MySessionsPage (A15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequests.getOwn.mockResolvedValue([]);
  });

  it('muestra fecha, modalidad y lugar de una sesión presencial próxima', async () => {
    mocked.getOwnSessions.mockResolvedValue([session({ id: '1', topic: 'Hábitos de estudio' })]);
    renderPage();
    expect(await screen.findByText('Hábitos de estudio')).toBeInTheDocument();
    expect(screen.getByText(/Presencial: Aula 12/)).toBeInTheDocument();
    expect(screen.getByText('Próxima')).toBeInTheDocument();
  });

  it('una sesión virtual enlaza la videollamada y no abre enlaces que no sean http(s)', async () => {
    mocked.getOwnSessions.mockResolvedValue([
      session({ id: '1', modality: 'VIRTUAL', location: null, meetingLink: 'https://meet.example/abc' }),
      session({ id: '2', topic: 'Otra', modality: 'VIRTUAL', location: null, meetingLink: 'javascript:alert(1)' }),
    ]);
    renderPage();
    const link = await screen.findByRole('link', { name: 'https://meet.example/abc' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('link', { name: /javascript:/ })).not.toBeInTheDocument();
    expect(screen.getByText(/javascript:alert\(1\)/)).toBeInTheDocument();
  });

  it('las canceladas aparecen aparte con su motivo', async () => {
    mocked.getOwnSessions.mockResolvedValue([
      session({ id: '1', topic: 'Cancelada', cancelledAt: day(-1), cancelReason: 'Tutor enfermo' }),
    ]);
    renderPage();
    expect(await screen.findByText(/Cancelada el .*: Tutor enfermo/)).toBeInTheDocument();
    expect(screen.getByText('Anteriores y canceladas')).toBeInTheDocument();
    expect(screen.getByText('No tienes sesiones próximas.')).toBeInTheDocument();
  });

  it('una cancelada sin reemplazo dice qué hacer después y enlaza a «Solicitar tutoría»', async () => {
    mocked.getOwnSessions.mockResolvedValue([session({ id: '1', topic: 'Reunión sin fecha', cancelledAt: day(-1), cancelReason: 'Tutor enfermo' })]);
    renderPage();
    expect(await screen.findByText('Reunión sin fecha')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar tutoría' })).toHaveAttribute('href', '/solicitar-tutoria');
  });

  it('una cita cancelada y su reemplazo se distinguen: «Reemplazada» con la fecha de la nueva, y la nueva dice que la reemplaza', async () => {
    mocked.getOwnSessions.mockResolvedValue([
      session({ id: 'old', topic: 'Cita vieja', cancelledAt: day(-1), cancelReason: 'Paro' }),
      session({ id: 'new', topic: 'Cita nueva', scheduledAt: day(5) }),
    ]);
    mockedRequests.getOwn.mockResolvedValue([
      { id: 'r1', sessionId: 'new', appointment: { state: 'VIGENTE', scheduledAt: day(5), modality: 'PRESENCIAL', place: 'Aula 12', replacedSessionIds: ['old'] } } as unknown as TutoringRequestView,
    ]);
    renderPage();
    expect(await screen.findByText('Reemplazada')).toBeInTheDocument();
    expect(screen.getByText(/Se programó otra cita:/)).toBeInTheDocument();
    expect(screen.getByText('Esta cita reemplaza a una que se canceló.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Solicitar tutoría' })).not.toBeInTheDocument(); // ya hay nueva cita: no hay que pedir nada
    expect(screen.getByText('Próxima')).toBeInTheDocument();
  });

  it('si las solicitudes no cargan, la agenda se muestra igual', async () => {
    mocked.getOwnSessions.mockResolvedValue([session({ id: '1', topic: 'Hábitos de estudio' })]);
    mockedRequests.getOwn.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Hábitos de estudio')).toBeInTheDocument();
  });

  it('mientras carga lo dice (visible y accesible), en vez de dejar solo el título (U03)', () => {
    mocked.getOwnSessions.mockReturnValue(new Promise(() => undefined)); // nunca responde
    renderPage();
    expect(screen.getByText('Cargando tus sesiones…')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Cargando tus sesiones…' })).toBeInTheDocument();
    expect(screen.queryByText('Aún no tienes sesiones programadas')).not.toBeInTheDocument(); // no confunde «cargando» con «sin sesiones»
  });

  it('si falla la consulta lo dice y permite reintentar', async () => {
    mocked.getOwnSessions.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('No se pudieron cargar tus sesiones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('sin sesiones explica cómo pedir una', async () => {
    mocked.getOwnSessions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Aún no tienes sesiones programadas')).toBeInTheDocument();
  });
});
