// Tematización global (HU-50): de un color institucional principal se deriva
// toda la gama azul de la interfaz, expresada como variables CSS (--azul, …).
type Rgb = [number, number, number];

export const DEFAULT_PRIMARY = '#14315F';
export const DEFAULT_ACCENT = '#D9A404';

/** Mismo mínimo que valida el servidor: el color principal lleva texto blanco encima (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

export const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const toRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** Mezcla `hex` con `other`; `amount` = proporción de `other` (0 a 1). */
export function mix(hex: string, other: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(other);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount) as Rgb);
}

function luminance(hex: string): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Variables CSS derivadas del color principal y el de acento. Con los colores
 * por defecto devuelve un objeto vacío: rige la hoja de estilos original y la
 * identidad UNTRM se ve exactamente como siempre.
 */
export function buildPaletteVars(primary: string, accent: string): Record<string, string> {
  const vars: Record<string, string> = {};

  if (!sameColor(primary, DEFAULT_PRIMARY)) {
    const med = mix(primary, '#FFFFFF', 0.2);
    const [r, g, b] = toRgb(med);
    Object.assign(vars, {
      '--azul': primary.toUpperCase(),
      '--azul-osc': mix(primary, '#000000', 0.35),
      '--azul-med': med,
      '--azul-claro': mix(primary, '#FFFFFF', 0.35),
      '--celeste': mix(primary, '#FFFFFF', 0.92),
      '--celeste-2': mix(primary, '#FFFFFF', 0.86),
      '--info': med,
      '--info-bg': mix(primary, '#FFFFFF', 0.92),
      '--focus-ring': `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.35)`,
    });
  }
  if (!sameColor(accent, DEFAULT_ACCENT)) vars['--dorado'] = accent.toUpperCase();
  return vars;
}

const MANAGED_VARS = ['--azul', '--azul-osc', '--azul-med', '--azul-claro', '--celeste', '--celeste-2', '--info', '--info-bg', '--focus-ring', '--dorado'];

/** Aplica la paleta a toda la aplicación y retira las variables que ya no se sobrescriben. */
export function applyPalette(primary: string, accent: string, root: HTMLElement = document.documentElement): void {
  const vars = buildPaletteVars(primary, accent);
  MANAGED_VARS.forEach((name) => {
    if (name in vars) root.style.setProperty(name, vars[name]);
    else root.style.removeProperty(name);
  });
}
