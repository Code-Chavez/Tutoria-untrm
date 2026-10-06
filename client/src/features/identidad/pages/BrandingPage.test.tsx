import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { BrandingProvider } from '@shared/theme/BrandingProvider';
import { BrandingPage } from './BrandingPage';
import { brandingService, DEFAULT_BRANDING } from '@shared/theme/brandingService';
import type { Branding } from '@shared/theme/brandingService';

vi.mock('@shared/theme/brandingService', async () => {
  const actual = await vi.importActual<typeof import('@shared/theme/brandingService')>('@shared/theme/brandingService');
  return { ...actual, brandingService: { get: vi.fn(), update: vi.fn(), uploadLogo: vi.fn(), removeLogo: vi.fn(), reset: vi.fn() } };
});

const mocked = vi.mocked(brandingService);

const saved: Branding = { ...DEFAULT_BRANDING, primaryColor: '#1B5E20', updatedAt: '2026-10-07T10:00:00.000Z' };

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <BrandingProvider>
        <BrandingPage />
      </BrandingProvider>
    </QueryClientTestWrapper>,
  );
}

describe('BrandingPage (HU-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    mocked.get.mockResolvedValue(DEFAULT_BRANDING);
  });

  it('muestra la identidad vigente y deja "Guardar" desactivado sin cambios', async () => {
    renderPage();

    expect(await screen.findByLabelText('Nombre corto')).toHaveValue('SIT · UNTRM');
    expect(screen.getByLabelText('Color principal')).toHaveValue('#14315F');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('guarda los cambios y los aplica a todo el sistema', async () => {
    mocked.update.mockResolvedValue(saved);
    const user = userEvent.setup();
    renderPage();

    const primary = await screen.findByLabelText('Color principal');
    await user.clear(primary);
    await user.type(primary, '#1B5E20');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mocked.update).toHaveBeenCalledWith(expect.objectContaining({ primaryColor: '#1B5E20', accentColor: '#D9A404' })),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('ya se aplica en todo el sistema');
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--azul')).toBe('#1B5E20'));
  });

  it('avisa y no deja guardar un color principal demasiado claro', async () => {
    const user = userEvent.setup();
    renderPage();

    const primary = await screen.findByLabelText('Color principal');
    await user.clear(primary);
    await user.type(primary, '#FFE08A');

    expect(screen.getByRole('alert')).toHaveTextContent(/demasiado claro/);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('avisa si el color no tiene el formato #RRGGBB', async () => {
    const user = userEvent.setup();
    renderPage();

    const accent = await screen.findByLabelText('Color de acento');
    await user.clear(accent);
    await user.type(accent, 'dorado');

    expect(screen.getByRole('alert')).toHaveTextContent('#RRGGBB');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('la vista previa usa los colores elegidos sin cambiar todavía el resto de la interfaz', async () => {
    const user = userEvent.setup();
    renderPage();

    const primary = await screen.findByLabelText('Color principal');
    await user.clear(primary);
    await user.type(primary, '#1B5E20');

    expect(screen.getByTestId('preview').style.getPropertyValue('--azul')).toBe('#1B5E20');
    expect(document.documentElement.style.getPropertyValue('--azul')).toBe('');
  });

  it('muestra el error del servidor al guardar', async () => {
    mocked.update.mockRejectedValue(
      Object.assign(new AxiosError('bad'), { response: { status: 400, data: { error: 'Los colores deben tener el formato #RRGGBB' } } }),
    );
    const user = userEvent.setup();
    renderPage();

    const short = await screen.findByLabelText('Nombre corto');
    await user.clear(short);
    await user.type(short, 'SIT Nuevo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Los colores deben tener el formato');
  });

  it('rechaza en el cliente un archivo que no es PNG, JPEG ni WebP', async () => {
    renderPage();
    await screen.findByLabelText('Nombre corto');

    fireEvent.change(screen.getByLabelText('Archivo del logotipo'), {
      target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPEG o WebP');
    expect(mocked.uploadLogo).not.toHaveBeenCalled();
  });

  it('sube un logotipo válido', async () => {
    mocked.uploadLogo.mockResolvedValue({ ...DEFAULT_BRANDING, hasCustomLogo: true, updatedAt: '2026-10-07T10:00:00.000Z' });
    renderPage();
    await screen.findByLabelText('Nombre corto');
    const file = new File(['png'], 'logo.png', { type: 'image/png' });

    await userEvent.upload(screen.getByLabelText('Archivo del logotipo'), file);

    await waitFor(() => expect(mocked.uploadLogo).toHaveBeenCalledWith(file));
    expect(await screen.findByRole('status')).toHaveTextContent('Logotipo actualizado');
  });

  it('restablece la identidad institucional tras confirmar', async () => {
    mocked.get.mockResolvedValue(saved);
    mocked.reset.mockResolvedValue(DEFAULT_BRANDING);
    const user = userEvent.setup();
    renderPage();

    // Espera a que llegue la identidad guardada: el editor se remonta con ella.
    await waitFor(() => expect(screen.getByLabelText('Color principal')).toHaveValue('#1B5E20'));
    await user.click(screen.getByRole('button', { name: 'Restablecer identidad UNTRM' }));
    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    await waitFor(() => expect(mocked.reset).toHaveBeenCalled());
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--azul')).toBe(''));
  });
});
