import { defineConfig, devices } from "@playwright/test";

// Playwright config: three projects.
//  - chromium (a11y + smoke, desktop)
//  - mobile-iphone (mobile-qa spec under iPhone 15 emulation)
//  - mobile-android (mobile-qa spec under Pixel 7 emulation)
// Device profile is set at the project level (per-describe test.use() of a
// full device profile is rejected because it changes the browser type).

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile-qa\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-iphone",
      testMatch: /(mobile-qa|mobile-priority|mobile-drawer|fix-verify)\.spec\.ts/,
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "mobile-android",
      testMatch: /(mobile-qa|mobile-priority|mobile-drawer|fix-verify)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
