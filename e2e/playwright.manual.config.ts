import { defineConfig } from '@playwright/test';

// Capturas de pantalla del manual de usuario (docs/MANUAL_USUARIO.md). No forma parte de la suite de pruebas:
//   cd e2e && E2E_CHANNEL=chrome npx playwright test -c playwright.manual.config.ts
// Pensado para un entorno recién sembrado (docker compose down -v && docker compose up -d --build) para que las
// pantallas muestren solo los datos de demostración.
export default defineConfig({
  testDir: './manual',
  timeout: 420_000,
  expect: { timeout: 45_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    channel: process.env.E2E_CHANNEL || undefined,
    locale: 'es-PE',
    viewport: { width: 1280, height: 800 },
  },
});
