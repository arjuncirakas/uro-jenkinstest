import { defineConfig, devices } from '@playwright/test';

// Use production URL by default, but allow override via environment variable
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://uroprep.ahimsa.global';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list']
  ],
  
  use: {
    baseURL: baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20000, // Increased for production network latency
    navigationTimeout: 60000, // Increased for production network latency
    // Wait for elements to be actionable
    waitForTimeout: 2000, // Wait 2 seconds before actions
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Removed webServer config since we're testing against production
  // If you want to test locally, set PLAYWRIGHT_BASE_URL=http://localhost:5173
  // and uncomment the webServer config below:
  
  // webServer: [
  //   {
  //     command: 'cd backend && npm run dev',
  //     url: 'http://localhost:5000/api/health',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //     stdout: 'ignore',
  //     stderr: 'pipe',
  //   },
  //   {
  //     command: 'cd frontend && npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //     stdout: 'ignore',
  //     stderr: 'pipe',
  //   },
  // ],
});


