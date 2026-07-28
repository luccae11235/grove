import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4322",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --dir ../.. --filter @grove/observability-api start",
      url: "http://127.0.0.1:3001/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "pnpm preview --host 127.0.0.1 --port 4322",
      url: "http://127.0.0.1:4322",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
