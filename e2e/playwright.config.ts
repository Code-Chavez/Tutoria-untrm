import { defineConfig } from '@playwright/test';

// Las pruebas corren contra el stack de desarrollo (docker compose up -d), ya migrado y sembrado.
// E2E_CHANNEL permite usar un navegador instalado (chrome, msedge) sin descargar el de Playwright.
export default defineConfig({
  testDir: './tests',
  timeout: 150_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    // E2E_BROWSER=firefox|webkit prueba con los navegadores de Playwright (WebKit no equivale a Safari real); por defecto, Chromium
    // (con E2E_CHANNEL=chrome|msedge, el navegador instalado en el equipo).
    browserName: (process.env.E2E_BROWSER as 'chromium' | 'firefox' | 'webkit' | undefined) ?? 'chromium',
    channel: process.env.E2E_BROWSER && process.env.E2E_BROWSER !== 'chromium' ? undefined : process.env.E2E_CHANNEL || undefined,
    locale: 'es-PE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
