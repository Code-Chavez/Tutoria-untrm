import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { MyTutoringRequestPage } from './MyTutoringRequestPage';
import { tutoringRequestService } from '../services/tutoringRequestService';
import type { TutoringRequest, TutoringRequestView } from '../services/tutoringRequestService';

vi.mock('../services/tutoringRequestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tutoringRequestService')>();
  return {
    ...actual,
    tutoringRequestService: {
      createOwnTutoringRequest: vi.fn(),
      getOwn: vi.fn(),
    },
  };
});

const mocked = vi.mocked(tutoringRequestService);

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
  createdAt: '2026-10-01T10:00:00.000Z',
  studentName: 'Ana Torres',
  studentCode: '20191234',
  routedToName: 'Elena Ramírez',
  handledByName: null,
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <MyTutoringRequestPage />
    </QueryClientTestWrapper>,
  );

describe('MyTutoringRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getOwn.mockResolvedValue([]);
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
});
