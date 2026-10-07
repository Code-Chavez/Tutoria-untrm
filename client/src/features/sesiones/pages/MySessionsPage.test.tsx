import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { MySessionsPage } from './MySessionsPage';
import { sessionService, type TutoringSession } from '../services/sessionService';

vi.mock('../services/sessionService', () => ({ sessionService: { getOwnSessions: vi.fn() } }));
const mocked = vi.mocked(sessionService);

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
      <MySessionsPage />
    </QueryClientTestWrapper>,
  );

describe('MySessionsPage (A15)', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('sin sesiones explica cómo pedir una', async () => {
    mocked.getOwnSessions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Aún no tienes sesiones programadas')).toBeInTheDocument();
  });
});
