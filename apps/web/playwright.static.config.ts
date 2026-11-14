import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_STATIC_PORT ?? "4323";
const base = process.env.BASE_PATH ?? "/";
const remoteURL = process.env.PLAYWRIGHT_STATIC_URL;
export default defineConfig({
  testDir: "./tests/static",
  timeout: remoteURL ? 90_000 : 30_000,
  workers: 1,
  use: { baseURL: remoteURL ?? `http://127.0.0.1:${port}${base}`, trace: "retain-on-failure" },
  webServer: remoteURL ? undefined : {
    command: `pnpm preview --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
