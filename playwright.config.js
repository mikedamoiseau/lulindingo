import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config for LuLinDingo.
 *
 * Tests live in e2e/. They drive the real app in a headless Chromium against
 * the Vite dev server (started automatically below). IndexedDB is per-context,
 * so each test starts from a clean slate.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
