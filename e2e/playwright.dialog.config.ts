import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './dialog-tests',
  testMatch: 'contract.spec.ts',
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/dialog-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5180',
    browserName: process.env.DIALOG_CHANNEL ? 'chromium' : 'firefox',
    channel: process.env.DIALOG_CHANNEL || undefined,
  },
  webServer: {
    command: 'node fixtures/serve-dialog.cjs',
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: !process.env.CI,
  },
});
