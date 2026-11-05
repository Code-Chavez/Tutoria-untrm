import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({ authService: { resetPassword: vi.fn() } }));
const mocked = vi.mocked(authService);

const renderAt = (path: string, mode?: 'reset' | 'activate') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/activar-cuenta/:token" element={<ResetPasswordPage mode={mode} />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage mode={mode} />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('en modo activación explica que el enlace sirve una sola vez y envía el token del enlace', async () => {
    mocked.resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt('/activar-cuenta/tok123', 'activate');

    expect(screen.getByRole('heading', { name: 'Activa tu cuenta' })).toBeInTheDocument();
    expect(screen.getByText(/sirve una sola vez/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nueva contraseña'), 'ClavePropia2026!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'ClavePropia2026!');
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));

    await waitFor(() => expect(mocked.resetPassword).toHaveBeenCalledWith('tok123', 'ClavePropia2026!'));
    expect(await screen.findByText(/Tu cuenta está activa/)).toBeInTheDocument();
  });

  it('exige que las dos contraseñas coincidan y un mínimo de 8 caracteres antes de enviar', async () => {
    const user = userEvent.setup();
    renderAt('/activar-cuenta/tok123', 'activate');

    await user.type(screen.getByLabelText('Nueva contraseña'), 'Larga2026!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Otra2026!x');
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();

    expect(mocked.resetPassword).not.toHaveBeenCalled();
  });

  it('muestra el motivo del servidor si el enlace ya se usó o venció', async () => {
    mocked.resetPassword.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { message: 'El enlace no es válido o ya venció' } } }));
    const user = userEvent.setup();
    renderAt('/activar-cuenta/tok123', 'activate');

    await user.type(screen.getByLabelText('Nueva contraseña'), 'ClavePropia2026!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'ClavePropia2026!');
    await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció');
  });

  it('en modo recuperación conserva su texto', () => {
    renderAt('/reset-password/tok123');

    expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restablecer contraseña' })).toBeInTheDocument();
  });
});
