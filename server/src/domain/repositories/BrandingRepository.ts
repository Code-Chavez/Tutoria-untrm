import { BrandingSettings } from '../entities/BrandingSettings';

export type BrandingTexts = Pick<BrandingSettings, 'institutionName' | 'shortName' | 'primaryColor' | 'accentColor'>;

export interface BrandingRepository {
  /** La configuración guardada, o null si rige la identidad por defecto. */
  find(): Promise<BrandingSettings | null>;
  /** Guarda nombres y colores sin tocar el logotipo. */
  save(data: BrandingTexts): Promise<BrandingSettings>;
  setLogo(storageKey: string, mimeType: string): Promise<BrandingSettings>;
  clearLogo(): Promise<void>;
  /** Vuelve a la identidad por defecto. */
  reset(): Promise<void>;
}
