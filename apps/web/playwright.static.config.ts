import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_STATIC_PORT ?? "4323";
const base = process.env.BASE_PATH ?? "/";
export default defineConfig({
  testDir: "./tests/static",
  timeout: 30_000,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}${base}`, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
