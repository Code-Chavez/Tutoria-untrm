import { readFileSync } from 'node:fs';
import path from 'node:path';

// Identidad visual UNTRM compartida por todas las exportaciones (HU-46).
export const BRAND = {
  institution: 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas',
  unit: 'Dirección de Bienestar Universitario · Sistema Integral de Tutoría',
  navy: '#0B1F3F',
  blue: '#2E5FA3',
  text: '#1B2430',
  muted: '#55606E',
  line: '#E4E9F1',
  band: '#F3F6FB',
} as const;

let cachedLogo: Buffer | null | undefined;

/** Logotipo institucional; si el archivo no está disponible, el documento se genera sin él. */
export function loadLogo(): Buffer | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    cachedLogo = readFileSync(path.resolve(process.cwd(), 'assets/logo-untrm.png'));
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}
