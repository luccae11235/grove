import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "./config.js";

const environment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://database.internal/grove",
  RESEND_API_KEY: "re_test",
  RESEND_WEBHOOK_SECRET: "whsec_test",
  RESEND_SEGMENT_ID: "segment_test",
  RESEND_TOPIC_ID: "",
  NEWSLETTER_FROM: "Grove <letters@grove.example>",
  NEWSLETTER_REPLY_TO: "",
  WEB_URL: "https://grove.example",
  API_PUBLIC_URL: "https://letters.grove.example",
  ALLOWED_ORIGINS: "https://grove.example",
  EVENT_HASH_SALT: "a-long-random-secret-for-tests",
} satisfies NodeJS.ProcessEnv;

test("runtime config accepts explicit HTTPS origins and empty optional values", () => {
  const config = loadConfig(environment);
  assert.deepEqual(config.allowedOrigins, ["https://grove.example"]);
  assert.equal(config.resendTopicId, undefined);
  assert.equal(config.newsletterReplyTo, undefined);
});

test("runtime config rejects wildcard, path-bearing, and insecure public origins", () => {
  assert.throws(() => loadConfig({ ...environment, ALLOWED_ORIGINS: "*" }), /wildcard/);
  assert.throws(
    () => loadConfig({ ...environment, API_PUBLIC_URL: "https://letters.grove.example/api" }),
    /without a path/,
  );
  assert.throws(
    () => loadConfig({ ...environment, WEB_URL: "http://grove.example" }),
    /HTTPS/,
  );
});
