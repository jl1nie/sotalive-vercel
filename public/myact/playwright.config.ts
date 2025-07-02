import { defineConfig, devices } from '@playwright/test'
import { ENVIRONMENT_CONFIG } from './src/config/environment'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  timeout: ENVIRONMENT_CONFIG.PLAYWRIGHT.TIMEOUT * 2,  // 60秒（API待機考慮）
  use: {
    baseURL: ENVIRONMENT_CONFIG.PLAYWRIGHT.SERVER_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: ENVIRONMENT_CONFIG.PLAYWRIGHT.SERVER_URL,
    reuseExistingServer: true,  // 既存サーバーを常に再利用
    timeout: ENVIRONMENT_CONFIG.TIMEOUTS.SERVER_STARTUP * 1000,  // 15秒
  },
})