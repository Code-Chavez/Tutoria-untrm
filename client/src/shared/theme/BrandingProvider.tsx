import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import defaultLogo from '@assets/logo-untrm.png';
import { applyPalette } from './palette';
import { Branding, brandingLogoUrl, brandingService, DEFAULT_BRANDING } from './brandingService';

const CACHE_KEY = 'sit.branding';

// La última identidad conocida se guarda para pintar la pantalla con ella desde
// el primer fotograma, sin parpadear con los colores por defecto mientras responde la API.
function readCache(): Branding | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_BRANDING, ...(JSON.parse(raw) as Partial<Branding>) } : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(branding: Branding): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(branding));
  } catch {
    // Sin almacenamiento disponible: la identidad se vuelve a pedir en cada carga.
  }
}

interface BrandingContextValue {
  branding: Branding;
  /** Logotipo vigente: el personalizado o el institucional incluido en la aplicación. */
  logoSrc: string;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: DEFAULT_BRANDING, logoSrc: defaultLogo });

export const BRANDING_QUERY_KEY = ['branding'] as const;

/**
 * Tematización global (HU-50): aplica la paleta como variables CSS sobre
 * <html> y el nombre corto como título del navegador. Si la API no responde,
 * rige la última identidad conocida o, en su defecto, la UNTRM por defecto.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: async () => {
      const branding = await brandingService.get();
      writeCache(branding);
      return branding;
    },
    initialData: readCache,
    // El caché solo sirve para pintar de inmediato: se considera caduco y se vuelve a pedir al montar.
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const branding = data ?? DEFAULT_BRANDING;

  useLayoutEffect(() => {
    applyPalette(branding.primaryColor, branding.accentColor);
    document.title = branding.shortName;
  }, [branding.primaryColor, branding.accentColor, branding.shortName]);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, logoSrc: branding.hasCustomLogo ? brandingLogoUrl(branding.updatedAt) : defaultLogo }),
    [branding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBranding = () => useContext(BrandingContext);
