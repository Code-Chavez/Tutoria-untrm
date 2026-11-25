import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('acepta indicando día y horas sin pedir lugar', async () => {
    mocked.respond.mockResolvedValue({ accepted: true });
    renderPage();

    await screen.findByLabelText('Acepto');
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Acepto'));
    expect(screen.getByText(/máximo 10 horas por semana/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Día 1'), '3');
    expect(screen.queryByLabelText('Lugar 1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    await waitFor(() => expect(mocked.respond).toHaveBeenCalledWith('tok123', { accept: true, availability: [{ day: 3, start: '08:00', end: '09:30' }] }));
    expect(await screen.findByRole('status')).toHaveTextContent('Su disponibilidad quedó registrada');
    expect(screen.getByRole('link', { name: 'Ir al sistema' })).toHaveAttribute('href', '/');
  });

  it('ofrece crear contraseña cuando el servidor indica primer acceso', async () => {
    mocked.respond.mockResolvedValue({ accepted: true, activationLink: '/activar-cuenta/one-use' });
    renderPage();
    await userEvent.click(await screen.findByLabelText('Acepto'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(await screen.findByRole('link', { name: 'Activar mi cuenta y crear contraseña' })).toHaveAttribute('href', '/activar-cuenta/one-use');
    expect(screen.queryByRole('link', { name: 'Ir al sistema' })).not.toBeInTheDocument();
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
    mocked.respond.mockResolvedValue({ accepted: true });
    renderPage();

    await userEvent.click(await screen.findByLabelText('No puedo asumirlo'));
    await userEvent.type(screen.getByLabelText('Motivo'), 'Licencia por estudios');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    await waitFor(() => expect(mocked.respond).toHaveBeenCalledWith('tok123', { accept: false, reason: 'Licencia por estudios' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Tu respuesta quedó registrada y está disponible para los responsables de tutoría.');
    // No afirma que se avisó a nadie ni que existe coordinación o que se asignará a otro docente.
    expect(status).not.toHaveTextContent(/avisó|coordinación|asigne|otro docente/i);
  });

  it('muestra el motivo real si el servidor rechaza la disponibilidad', async () => {
    mocked.respond.mockRejectedValue(apiError('Cada horario debe durar al menos 45 minutos (una sesión)'));
    renderPage();

    await userEvent.click(await screen.findByLabelText('Acepto'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 45 minutos');
  });

  it('si el horario queda más corto que una sesión, corrige la hora final a inicio + 45 minutos', async () => {
    renderPage();
    await userEvent.click(await screen.findByLabelText('Acepto'));

    // Hasta antes que el mínimo: 08:00 → 08:20 pasa a 08:45.
    fireEvent.change(screen.getByLabelText('Hasta 1'), { target: { value: '08:20' } });
    expect(screen.getByLabelText('Hasta 1')).toHaveValue('08:45');
    expect(screen.getByText(/pasó a 08:45/)).toBeInTheDocument();

    // Desde que deja el fin demasiado cerca: 10:00 con fin 08:45 → 10:45.
    fireEvent.change(screen.getByLabelText('Desde 1'), { target: { value: '10:00' } });
    expect(screen.getByLabelText('Hasta 1')).toHaveValue('10:45');

    // Una hora final válida no se toca.
    fireEvent.change(screen.getByLabelText('Hasta 1'), { target: { value: '12:00' } });
    expect(screen.getByLabelText('Hasta 1')).toHaveValue('12:00');
    expect(screen.queryByText(/pasó a/)).not.toBeInTheDocument();
  });
});
