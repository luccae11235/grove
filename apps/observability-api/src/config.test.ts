import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "./config.js";

const environment = {
  DATABASE_URL: "postgresql://database.internal/grove",
  ALLOWED_ORIGINS: "https://aflora.page, https://staging.aflora.page",
  OBSERVABILITY_LINK_SECRET: "a-long-environment-specific-observability-secret",
  DEPLOYMENT_ENV: "staging",
} satisfies NodeJS.ProcessEnv;

test("config accepts explicit isolated environment settings", () => {
  const config = loadConfig(environment);
  assert.deepEqual(config.allowedOrigins, [
    "https://aflora.page",
    "https://staging.aflora.page",
  ]);
  assert.equal(config.deploymentEnvironment, "staging");
  assert.equal(config.consentVersion, "2026-07");
});

test("config rejects wildcard, insecure, path-bearing, and weak secrets", () => {
  assert.throws(() => loadConfig({ ...environment, ALLOWED_ORIGINS: "*" }), /explicit origins/);
  assert.throws(
    () => loadConfig({ ...environment, ALLOWED_ORIGINS: "http://aflora.page" }),
    /HTTPS/,
  );
  assert.throws(
    () => loadConfig({ ...environment, ALLOWED_ORIGINS: "https://aflora.page/path" }),
    /without paths/,
  );
  assert.throws(
    () => loadConfig({ ...environment, OBSERVABILITY_LINK_SECRET: "short" }),
    /too small/i,
  );
});
