import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3100',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'PORT=3100 E2E_TEST_MODE=1 NEXT_PUBLIC_APP_URL=http://localhost:3100 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_TEST_MODE: '1',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy',
    },
  },
})
