import { defineConfig, devices } from "@playwright/test";

// E2E varsayılan olarak production build'i ("pnpm build && pnpm start")
// test eder; PW_DEV_SERVER=1 ile dev sunucuya döner.
const useProdServer = process.env.PW_DEV_SERVER !== "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: useProdServer ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
