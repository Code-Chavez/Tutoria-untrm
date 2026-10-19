import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

export interface AxeFinding {
  id: string;
  impact: string;
  help: string;
  nodes: number;
  target: string;
}

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
// Reglas moderadas/leves que ya se corrigieron y no deben volver: estructura (un <main>, contenido en regiones, títulos en orden)
// y encabezados de tabla con texto. El resto de las leves solo se anota.
const MUST_STAY_FIXED = new Set(['landmark-one-main', 'region', 'heading-order', 'empty-table-header']);

/**
 * Revisa la pantalla (o un tramo) con axe. Falla con las infracciones serias o críticas (contraste, etiquetas, nombres de botones,
 * roles…) y con las reglas de estructura ya corregidas; las leves y moderadas no hacen fallar pero quedan anotadas en el informe, sin ocultarlas. Axe no sustituye la prueba con
 * teclado ni con lector de pantalla: por eso las pruebas de foco y teclado van aparte.
 */
export async function expectNoSeriousViolations(page: Page, testInfo: TestInfo, label: string, selector?: string): Promise<AxeFinding[]> {
  let builder = new AxeBuilder({ page }).withTags(RULES);
  if (selector) builder = builder.include(selector); // p. ej. un diálogo abierto: se revisa solo lo que la persona tiene delante
  const { violations } = await builder.analyze();
  const findings: AxeFinding[] = violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? 'unknown',
    help: v.help,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target.join(' ') ?? '',
  }));
  const blocking = findings.filter((f) => f.impact === 'serious' || f.impact === 'critical' || MUST_STAY_FIXED.has(f.id));
  const minor = findings.filter((f) => !blocking.includes(f));
  if (minor.length > 0) testInfo.annotations.push({ type: `axe-leves: ${label}`, description: minor.map((f) => `${f.id} (${f.impact}, ${f.nodes}): ${f.help}`).join(' | ') });
  expect(blocking, `Infracciones serias o críticas en «${label}»:\n${blocking.map((f) => `- ${f.id} [${f.impact}] ${f.help} (${f.nodes} elementos, p. ej. ${f.target})`).join('\n')}`).toEqual([]);
  return findings;
}
