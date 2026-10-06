/** Luminancia relativa de un color #RRGGBB según WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Relación de contraste WCAG entre dos colores #RRGGBB (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Mínimo AA para texto normal. El color principal lleva texto blanco encima (botones, barra lateral). */
export const MIN_TEXT_CONTRAST = 4.5;
