import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { ParametersPage } from './ParametersPage';
import { parameterService } from '../services/parameterService';
import type { SystemParameter } from '../services/parameterService';

vi.mock('../services/parameterService', () => ({ parameterService: { list: vi.fn(), update: vi.fn() } }));

const mocked = vi.mocked(parameterService);

const param = (over: Partial<SystemParameter>): SystemParameter => ({
  key: 'session_duration_minutes',
  label: 'Duración de la sesión',
  description: 'Duración de cada sesión.',
  unit: 'minutos',
  min: 15,
  max: 180,
  defaultValue: 45,
  group: 'Sesiones',
  value: 45,
  isDefault: true,
  ...over,
});

const parameters = [
  param({}),
  param({ key: 'max_sessions_per_semester', label: 'Número de sesiones por semestre', unit: 'sesiones', min: 1, max: 30, defaultValue: 8, value: 10, isDefault: false }),
  param({ key: 'referral_followup_deadline_hours', label: 'Plazo de atención de derivaciones', unit: 'horas', min: 1, max: 720, defaultValue: 48, value: 48, group: 'Alertas y plazos' }),
];

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <ParametersPage />
    </QueryClientTestWrapper>,
  );
}

describe('ParametersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.list.mockResolvedValue(parameters);
  });

  it('agrupa los parámetros y marca los que usan el valor predeterminado', async () => {
    renderPage();

    expect(await screen.findByText('Sesiones')).toBeInTheDocument();
    expect(screen.getByText('Alertas y plazos')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Duración de la sesión/ })).toHaveValue(45);
    expect(screen.getByRole('spinbutton', { name: /Número de sesiones por semestre/ })).toHaveValue(10);
    // Solo los que no tienen valor guardado llevan la etiqueta.
    expect(screen.getAllByText('Predeterminado')).toHaveLength(2);
  });

  it('guarda un valor válido', async () => {
    mocked.update.mockResolvedValue(param({ value: 60, isDefault: false }));
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByRole('spinbutton', { name: /Duración de la sesión/ });
    await user.clear(input);
    await user.type(input, '60');
    await user.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    await waitFor(() => expect(mocked.update).toHaveBeenCalledWith('session_duration_minutes', 60));
  });

  it('no deja guardar un valor fuera de rango y lo explica', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByRole('spinbutton', { name: /Duración de la sesión/ });
    await user.clear(input);
    await user.type(input, '5');

    expect(screen.getAllByRole('button', { name: 'Guardar' })[0]).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('entre 15 y 180');
    expect(mocked.update).not.toHaveBeenCalled();
  });

  it('"Guardar" está desactivado mientras no haya cambios', async () => {
    renderPage();
    await screen.findByRole('spinbutton', { name: /Duración de la sesión/ });

    screen.getAllByRole('button', { name: 'Guardar' }).forEach((b) => expect(b).toBeDisabled());
  });

  it('restablece el valor predeterminado solo si el valor actual es distinto', async () => {
    mocked.update.mockResolvedValue(param({ key: 'max_sessions_per_semester', value: 8, isDefault: false }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('spinbutton', { name: /Duración de la sesión/ });

    expect(screen.getByRole('button', { name: 'Restablecer Duración de la sesión' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Restablecer Número de sesiones por semestre' }));

    await waitFor(() => expect(mocked.update).toHaveBeenCalledWith('max_sessions_per_semester', 8));
  });

  it('muestra el error que devuelve la API', async () => {
    mocked.update.mockRejectedValue(
      Object.assign(new AxiosError('bad'), { response: { status: 400, data: { error: 'Duración de la sesión: ingresa un número entero entre 15 y 180 minutos' } } }),
    );
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByRole('spinbutton', { name: /Duración de la sesión/ });
    await user.clear(input);
    await user.type(input, '60');
    await user.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('ingresa un número entero');
  });

  it('ofrece reintentar si falla la carga', async () => {
    mocked.list.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText('No se pudieron cargar los parámetros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
