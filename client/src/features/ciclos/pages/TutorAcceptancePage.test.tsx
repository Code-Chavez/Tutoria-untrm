import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TutorAcceptancePage } from './TutorAcceptancePage';
import { tutorAcceptanceService } from '../services/tutorAcceptanceService';

vi.mock('../services/tutorAcceptanceService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tutorAcceptanceService')>();
  return { ...actual, tutorAcceptanceService: { info: vi.fn(), respond: vi.fn() } };
});
const mocked = vi.mocked(tutorAcceptanceService);

const info = { tutorName: 'Elena Ramírez', school: 'Ingeniería de Sistemas', cycle: 3, period: '2026-II', isException: false, maxWeeklyHours: 10, sessionMinutes: 45 };
const apiError = (message: string) => Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: message } } });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/aceptar-tutoria/tok123']}>
      <Routes>
        <Route path="/aceptar-tutoria/:token" element={<TutorAcceptancePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TutorAcceptancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.info.mockResolvedValue(info);
  });

  it('un enlace inválido o vencido muestra el motivo y nada más', async () => {
    mocked.info.mockRejectedValue(apiError('El enlace no es válido o ya venció.'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció.');
    expect(screen.queryByRole('button', { name: 'Enviar respuesta' })).not.toBeInTheDocument();
  });

  it('acepta indicando día, horas y lugar', async () => {
    mocked.respond.mockResolvedValue();
    renderPage();

    await screen.findByLabelText('Acepto');
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Acepto'));
    expect(screen.getByText(/máximo 10 horas por semana/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Día 1'), '3');
    await userEvent.type(screen.getByLabelText('Lugar 1'), 'Aula 12');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    await waitFor(() => expect(mocked.respond).toHaveBeenCalledWith('tok123', { accept: true, availability: [{ day: 3, start: '08:00', end: '09:30', place: 'Aula 12' }] }));
    expect(await screen.findByRole('status')).toHaveTextContent('Su disponibilidad quedó registrada');
  });

  it('puede agregar y quitar horarios', async () => {
    renderPage();

    await userEvent.click(await screen.findByLabelText('Acepto'));
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar otro horario' }));
    expect(screen.getByLabelText('Día 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar horario 2' }));
    expect(screen.queryByLabelText('Día 2')).not.toBeInTheDocument();
  });

  it('rechaza con su motivo', async () => {
    mocked.respond.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByLabelText('No puedo asumirlo'));
    await userEvent.type(screen.getByLabelText('Motivo'), 'Licencia por estudios');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    await waitFor(() => expect(mocked.respond).toHaveBeenCalledWith('tok123', { accept: false, reason: 'Licencia por estudios' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Se avisó a la coordinación');
  });

  it('muestra el motivo real si el servidor rechaza la disponibilidad', async () => {
    mocked.respond.mockRejectedValue(apiError('Cada horario debe durar al menos 45 minutos (una sesión)'));
    renderPage();

    await userEvent.click(await screen.findByLabelText('Acepto'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 45 minutos');
  });
});
