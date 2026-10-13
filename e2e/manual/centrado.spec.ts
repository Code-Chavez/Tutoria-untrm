import { test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { loginUi } from '../support/ui';

// Auditoría del centrado: para cada página de cada rol mide el espacio libre a la izquierda y a la derecha del contenido
// dentro del contenedor central. Una diferencia grande con contenido más angosto que el contenedor = página pegada a un lado.
// Uso: E2E_CHANNEL=chrome npx playwright test -c playwright.manual.config.ts -g centrado
test.describe.configure({ mode: 'serial' });

for (const [key, account] of Object.entries(accounts)) {
  test(`centrado: ${key}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await loginUi(page, account);
    const links = await page.locator('nav a').evaluateAll((as) => as.map((a) => ({ text: a.textContent?.trim() ?? '', href: a.getAttribute('href') ?? '' })));
    const rows: string[] = [];
    for (const link of links) {
      await page.locator('nav').getByRole('link', { name: link.text, exact: true }).click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => {
        const container = document.querySelector('[class*="_content_"]') as HTMLElement | null;
        const child = container?.firstElementChild as HTMLElement | null;
        if (!container || !child) return null;
        const c = container.getBoundingClientRect();
        const k = child.getBoundingClientRect();
        const cs = getComputedStyle(container);
        const padL = parseFloat(cs.paddingLeft);
        const padR = parseFloat(cs.paddingRight);
        return { cw: Math.round(c.width - padL - padR), w: Math.round(k.width), left: Math.round(k.left - c.left - padL), right: Math.round(c.right - padR - k.right) };
      });
      if (!m) { rows.push(`?    ${link.text} (sin contenedor)`); continue; }
      const off = Math.abs(m.left - m.right);
      rows.push(`${off > 24 && m.w < m.cw - 24 ? 'DESCENTRADA' : 'ok         '} ${link.text.padEnd(28)} contenedor ${m.cw}px · contenido ${m.w}px · izq ${m.left} · der ${m.right}`);
    }
    console.log(`\n== ${key} (${account.role})\n${rows.join('\n')}`);
  });
}
