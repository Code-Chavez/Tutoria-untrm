import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AdmonitionsPage } from './AdmonitionsPage';
import { admonitionService } from '../services/admonitionService';

let role = 'Decano';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role } }) }));
vi.mock('../services/admonitionService', () => ({ admonitionService: { list: vi.fn(), tutors: vi.fn(), issue: vi.fn(), downloadFile: vi.fn() } }));
const mocked = vi.mocked(admonitionService);

const row = { id: 'a1', tutorId: 't1', tutorName: 'Elena Ramírez', schoolName: 'Ingeniería de Sistemas', issuedOn: '2026-11-09', reason: 'No registró sesiones en el periodo', issuedByName: 'Héctor Vargas', hasFile: true, fileName: 'resolucion.pdf' };

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <AdmonitionsPage />
    </QueryClientTestWrapper>,
  );

describe('AdmonitionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'Decano';
    mocked.list.mockResolvedValue([row]);
    mocked.tutors.mockResolvedValue([{ tutorId: 't1', fullName: 'Elena Ramírez', schoolId: 's1', schoolName: 'Ingeniería de Sistemas' }]);
  });

  it('lista las amonestaciones con su motivo y permite descargar el documento', async () => {
    renderPage();

    expect(await screen.findByText('No registró sesiones en el periodo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Descargar documento de Elena Ramírez' }));
    expect(mocked.downloadFile).toHaveBeenCalledWith('a1', 'resolucion.pdf');
  });

  it('el Decano registra una amonestación con docente, fecha, motivo y documento', async () => {
    mocked.issue.mockResolvedValue();
    renderPage();
    const file = new File(['%PDF'], 'resolucion.pdf', { type: 'application/pdf' });

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva amonestación' }));
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
    await userEvent.selectOptions(await screen.findByLabelText('Docente tutor'), 't1');
    await userEvent.type(screen.getByLabelText('Motivo'), 'No registró ninguna sesión');
    await userEvent.upload(screen.getByLabelText(/Documento/), file);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(mocked.issue).toHaveBeenCalledWith(expect.objectContaining({ tutorId: 't1', reason: 'No registró ninguna sesión', file })));
    expect(await screen.findByRole('status')).toHaveTextContent('Amonestación registrada');
  });

  it('muestra el motivo real si el servidor la rechaza y deja abierto el formulario', async () => {
    mocked.issue.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'Solo puede amonestar a docentes de su propia facultad' } } }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva amonestación' }));
    await userEvent.selectOptions(await screen.findByLabelText('Docente tutor'), 't1');
    await userEvent.type(screen.getByLabelText('Motivo'), 'No registró ninguna sesión');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('propia facultad');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('la coordinación solo consulta: no ve el botón de nueva amonestación ni pide la lista de docentes', async () => {
    role = 'Coordinador';
    renderPage();

    await screen.findByText('No registró sesiones en el periodo');
    expect(screen.queryByRole('button', { name: 'Nueva amonestación' })).not.toBeInTheDocument();
    expect(mocked.tutors).not.toHaveBeenCalled();
  });

  it('sin amonestaciones lo dice', async () => {
    mocked.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Sin amonestaciones')).toBeInTheDocument();
  });
});
