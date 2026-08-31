import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from './ProfilePage';
import { profileService } from '../services/profileService';
import type { UserProfile } from '../types/profile.types';

vi.mock('../services/profileService', () => ({
  profileService: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const mocked = vi.mocked(profileService);

const profile: UserProfile = {
  id: 'user-1',
  email: 'tutor@untrm.edu.pe',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '987654321',
  photoUrl: null,
  role: 'Docente Tutor',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.get.mockResolvedValue(profile);
  });

  it('muestra los datos del perfil tras cargar', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('tutor@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByText('Docente Tutor')).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue('987654321');
  });

  it('guarda los cambios de contacto', async () => {
    mocked.update.mockResolvedValue({ ...profile, phone: '999888777' });
    const user = userEvent.setup();
    render(<ProfilePage />);

    const phone = await screen.findByLabelText(/teléfono/i);
    await user.clear(phone);
    await user.type(phone, '999888777');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mocked.update).toHaveBeenCalledWith({ phone: '999888777', photoUrl: '' });
    });
    expect(await screen.findByText(/datos actualizados/i)).toBeInTheDocument();
  });

  it('no envía el cambio de contraseña si la confirmación no coincide', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('Juan Pérez');
    await user.type(screen.getByLabelText(/contraseña actual/i), 'Actual123');
    await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'NuevaClave1');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'NuevaClave2');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    expect(await screen.findByText(/la confirmación no coincide/i)).toBeInTheDocument();
    expect(mocked.changePassword).not.toHaveBeenCalled();
  });

  it('cambia la contraseña cuando los datos son válidos', async () => {
    mocked.changePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProfilePage />);

    await screen.findByText('Juan Pérez');
    await user.type(screen.getByLabelText(/contraseña actual/i), 'Actual123');
    await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'NuevaClave1');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'NuevaClave1');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(mocked.changePassword).toHaveBeenCalledWith({
        currentPassword: 'Actual123',
        newPassword: 'NuevaClave1',
      });
    });
    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
  });
});
