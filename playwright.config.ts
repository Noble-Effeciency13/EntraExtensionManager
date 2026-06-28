import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config. The smoke tests drive the offline demo mode, so they
 * need no Microsoft Entra sign-in. Run with `npm run test:e2e` (first time:
 * `npx playwright install chromium` to download the browser).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
