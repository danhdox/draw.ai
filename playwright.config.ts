import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

// Smoke suite. Runs against a production build (`next start`) so it mirrors what
// ships. Run `pnpm build` first, then `pnpm test:e2e`.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `node_modules/.bin/next start -p ${PORT}`,
    url: baseURL,
    // Always start a fresh server with the AI key cleared so the e2e suite uses
    // the deterministic offline fallback and never spends OpenAI credits.
    reuseExistingServer: false,
    timeout: 120_000,
    env: { OPENAI_API_KEY: '' },
  },
})
