import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrandingProvider, useBranding } from './BrandingProvider';
import { brandingService, DEFAULT_BRANDING } from './brandingService';
import type { Branding } from './brandingService';

vi.mock('./brandingService', async () => {
  const actual = await vi.importActual<typeof import('./brandingService')>('./brandingService');
  return { ...actual, brandingService: { get: vi.fn() } };
});

const mocked = vi.mocked(brandingService);

const custom: Branding = {
  institutionName: 'Universidad de Prueba',
  shortName: 'SIT · PRUEBA',
  primaryColor: '#1B5E20',
  accentColor: '#C9A100',
  hasCustomLogo: true,
  updatedAt: '2026-10-07T10:00:00.000Z',
};

function Probe() {
  const { branding, logoSrc } = useBranding();
  return (
    <>
      <span data-testid="short">{branding.shortName}</span>
      <span data-testid="logo">{logoSrc}</span>
    </>
  );
}

function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrandingProvider>
        <Probe />
      </BrandingProvider>
    </QueryClientProvider>,
  );
}

describe('BrandingProvider (HU-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.title = '';
  });

  it('aplica la paleta como variables CSS, el nombre corto como título y el logotipo personalizado', async () => {
    mocked.get.mockResolvedValue(custom);
    renderProvider();

    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--azul')).toBe('#1B5E20'));
    expect(document.documentElement.style.getPropertyValue('--dorado')).toBe('#C9A100');
    expect(document.title).toBe('SIT · PRUEBA');
    expect(screen.getByTestId('logo').textContent).toContain('/branding/logo?v=');
  });

  it('con la identidad por defecto no toca las variables y usa el logotipo incluido', async () => {
    mocked.get.mockResolvedValue(DEFAULT_BRANDING);
    renderProvider();

    await waitFor(() => expect(document.title).toBe('SIT · UNTRM'));
    expect(document.documentElement.style.getPropertyValue('--azul')).toBe('');
    expect(screen.getByTestId('logo').textContent).not.toContain('/branding/logo');
  });

  it('pinta desde el primer fotograma con la última identidad conocida (sin parpadeo)', async () => {
    localStorage.setItem('sit.branding', JSON.stringify(custom));
    mocked.get.mockImplementation(() => new Promise(() => undefined)); // la API tarda
    renderProvider();

    expect(screen.getByTestId('short').textContent).toBe('SIT · PRUEBA');
    expect(document.documentElement.style.getPropertyValue('--azul')).toBe('#1B5E20');
  });

  it('guarda en caché la identidad recibida y la actualiza si cambió en el servidor', async () => {
    localStorage.setItem('sit.branding', JSON.stringify(custom));
    mocked.get.mockResolvedValue({ ...custom, primaryColor: '#7B1FA2', shortName: 'SIT · NUEVO' });
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('short').textContent).toBe('SIT · NUEVO'));
    expect(JSON.parse(localStorage.getItem('sit.branding') as string).primaryColor).toBe('#7B1FA2');
    expect(document.documentElement.style.getPropertyValue('--azul')).toBe('#7B1FA2');
  });

  it('si la API falla rige la identidad por defecto (el login sigue funcionando)', async () => {
    mocked.get.mockRejectedValue(new Error('sin conexión'));
    renderProvider();

    await waitFor(() => expect(mocked.get).toHaveBeenCalled());
    expect(screen.getByTestId('short').textContent).toBe('SIT · UNTRM');
    expect(document.documentElement.style.getPropertyValue('--azul')).toBe('');
  });

  it('sin proveedor, useBranding devuelve la identidad por defecto', () => {
    render(<Probe />);
    expect(screen.getByTestId('short').textContent).toBe('SIT · UNTRM');
  });
});
