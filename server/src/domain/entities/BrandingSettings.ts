// Identidad visual institucional configurable (HU-50).
export interface BrandingSettings {
  institutionName: string;
  /** Nombre corto que acompaña al logotipo en la barra lateral y el título del navegador. */
  shortName: string;
  /** Color institucional principal; de él se deriva toda la paleta azul de la interfaz. */
  primaryColor: string;
  /** Color de acento (detalles y destacados). */
  accentColor: string;
  logoStorageKey: string | null;
  logoMimeType: string | null;
  /** null mientras rija la identidad por defecto. */
  updatedAt: Date | null;
}

/** Identidad UNTRM por defecto, coherente con untrm.edu.pe. */
export const DEFAULT_BRANDING: BrandingSettings = {
  institutionName: 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas',
  shortName: 'SIT · UNTRM',
  primaryColor: '#14315F',
  accentColor: '#D9A404',
  logoStorageKey: null,
  logoMimeType: null,
  updatedAt: null,
};
