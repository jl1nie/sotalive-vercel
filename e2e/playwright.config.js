const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 800 }, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' },
  webServer: { command: 'node serve.js', url: 'http://localhost:4173/', reuseExistingServer: true },
});
