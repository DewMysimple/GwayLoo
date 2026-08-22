import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4176',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'low-performance', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4176',
      url: 'http://127.0.0.1:4176',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'python -m http.server 4177 --bind 127.0.0.1 --directory "C:\\Users\\Administrator\\Desktop\\网页(1)"',
      url: 'http://127.0.0.1:4177',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
