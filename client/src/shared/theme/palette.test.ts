import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyPalette,
  buildPaletteVars,
  contrastRatio,
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  isHexColor,
  MIN_TEXT_CONTRAST,
  mix,
} from './palette';

describe('palette (HU-50)', () => {
  it('reconoce colores #RRGGBB', () => {
    expect(isHexColor('#14315F')).toBe(true);
    expect(isHexColor('#14315f')).toBe(true);
    expect(isHexColor('14315F')).toBe(false);
    expect(isHexColor('#FFF')).toBe(false);
    expect(isHexColor('azul')).toBe(false);
  });

  it('mezcla colores por proporción', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('calcula el contraste WCAG como el servidor', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio(DEFAULT_PRIMARY, '#FFFFFF')).toBeGreaterThan(MIN_TEXT_CONTRAST);
    expect(contrastRatio('#FFE08A', '#FFFFFF')).toBeLessThan(MIN_TEXT_CONTRAST);
  });

  describe('buildPaletteVars', () => {
    it('con los colores por defecto no sobrescribe nada: rige la hoja de estilos original', () => {
      expect(buildPaletteVars(DEFAULT_PRIMARY, DEFAULT_ACCENT)).toEqual({});
      expect(buildPaletteVars(DEFAULT_PRIMARY.toLowerCase(), DEFAULT_ACCENT.toLowerCase())).toEqual({});
    });

    it('deriva toda la gama azul del color principal, de más oscuro a más claro', () => {
      const vars = buildPaletteVars('#1B5E20', DEFAULT_ACCENT);

      expect(vars['--azul']).toBe('#1B5E20');
      expect(vars['--dorado']).toBeUndefined();
      const lum = (hex: string) => contrastRatio(hex, '#000000');
      expect(lum(vars['--azul-osc'])).toBeLessThan(lum(vars['--azul']));
      expect(lum(vars['--azul'])).toBeLessThan(lum(vars['--azul-med']));
      expect(lum(vars['--azul-med'])).toBeLessThan(lum(vars['--azul-claro']));
      expect(lum(vars['--azul-claro'])).toBeLessThan(lum(vars['--celeste-2']));
      expect(lum(vars['--celeste-2'])).toBeLessThan(lum(vars['--celeste']));
      expect(vars['--info']).toBe(vars['--azul-med']);
      expect(vars['--focus-ring']).toMatch(/^0 0 0 3px rgba\(\d+, \d+, \d+, 0\.35\)$/);
    });

    it('cambia solo el acento si el principal es el institucional', () => {
      expect(buildPaletteVars(DEFAULT_PRIMARY, '#C9A100')).toEqual({ '--dorado': '#C9A100' });
    });
  });

  describe('applyPalette', () => {
    let root: HTMLElement;
    beforeEach(() => {
      root = document.createElement('div');
    });

    it('aplica las variables y las retira al volver a los colores por defecto', () => {
      applyPalette('#1B5E20', '#C9A100', root);
      expect(root.style.getPropertyValue('--azul')).toBe('#1B5E20');
      expect(root.style.getPropertyValue('--dorado')).toBe('#C9A100');

      applyPalette(DEFAULT_PRIMARY, DEFAULT_ACCENT, root);
      expect(root.style.getPropertyValue('--azul')).toBe('');
      expect(root.style.getPropertyValue('--azul-med')).toBe('');
      expect(root.style.getPropertyValue('--dorado')).toBe('');
    });
  });
});
