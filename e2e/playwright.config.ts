import { defineConfig, devices } from "@playwright/test";

const API_BASE = process.env.API_URL || "http://localhost:3001/api";
const APP_BASE = process.env.APP_URL || "http://localhost:5173";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30000,
  use: {
    baseURL: APP_BASE,
    trace: process.env.CI ? "retain-on-failure" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @workspace/qbuddy dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "pnpm --filter @workspace/api-server start",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { NODE_ENV: "development" },
    },
  ],
});
