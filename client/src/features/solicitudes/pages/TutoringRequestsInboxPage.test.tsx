import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { TutoringRequestsInboxPage } from './TutoringRequestsInboxPage';
import { tutoringRequestService } from '../services/tutoringRequestService';
import type { TutoringRequestView } from '../services/tutoringRequestService';

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
  createdAt: '2026-10-01T10:00:00.000Z',
  studentName: 'Ana Torres',
  studentCode: '20191234',
  routedToName: 'Elena Ramírez',
  handledByName: null,
  ...over,
});

const renderPage = (url = '/solicitudes') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientTestWrapper>
        <TutoringRequestsInboxPage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('TutoringRequestsInboxPage (R01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getInbox.mockResolvedValue([request()]);
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
});
