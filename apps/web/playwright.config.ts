import { defineConfig } from "@playwright/test";

const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "4322";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
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
      command: `pnpm preview --host 127.0.0.1 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
