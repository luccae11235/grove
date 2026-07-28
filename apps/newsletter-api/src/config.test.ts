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
  NEWSLETTER_RECIPIENT_ALLOWLIST: "",
  NEWSLETTER_PUBLIC_SIGNUP: "true",
  NEWSLETTER_FROM: "Grove <letters@grove.example>",
  NEWSLETTER_REPLY_TO: "",
  WEB_URL: "https://grove.example",
  API_PUBLIC_URL: "https://letters.grove.example",
  ALLOWED_ORIGINS: "https://grove.example",
  EVENT_HASH_SALT: "a-long-random-secret-for-tests",
  DEPLOYMENT_ENV: "production",
  OBSERVABILITY_LINK_SECRET: "",
} satisfies NodeJS.ProcessEnv;

test("runtime config accepts explicit HTTPS origins and empty optional values", () => {
  const config = loadConfig(environment);
  assert.deepEqual(config.allowedOrigins, ["https://grove.example"]);
  assert.equal(config.resendTopicId, undefined);
  assert.equal(config.newsletterReplyTo, undefined);
  assert.equal(config.recipientAllowlist, undefined);
  assert.equal(config.publicSignup, true);
  assert.equal(config.deploymentEnvironment, "production");
  assert.equal(config.observabilityLinkSecret, undefined);
  assert.equal(config.actionTtlHours, 24);
  assert.equal(config.resendCooldownSeconds, 60);
});

test("runtime config normalizes and validates the recipient allowlist", () => {
  const config = loadConfig({
    ...environment,
    NEWSLETTER_RECIPIENT_ALLOWLIST: " Reader@Example.com,reader@example.com, second@example.com ",
    NEWSLETTER_PUBLIC_SIGNUP: "false",
  });
  assert.deepEqual(config.recipientAllowlist, ["reader@example.com", "second@example.com"]);
  assert.throws(
    () => loadConfig({ ...environment, NEWSLETTER_RECIPIENT_ALLOWLIST: "not-an-email" }),
    /email/i,
  );
});

test("runtime config requires an explicit choice between allowlisted and public signup", () => {
  assert.throws(
    () => loadConfig({
      ...environment,
      NEWSLETTER_PUBLIC_SIGNUP: "false",
      NEWSLETTER_RECIPIENT_ALLOWLIST: "",
    }),
    /ALLOWLIST is required/,
  );
  assert.throws(
    () => loadConfig({
      ...environment,
      NEWSLETTER_PUBLIC_SIGNUP: "true",
      NEWSLETTER_RECIPIENT_ALLOWLIST: "reader@example.com",
    }),
    /mutually exclusive/,
  );
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
  assert.throws(
    () => loadConfig({ ...environment, SUBSCRIPTION_RESEND_COOLDOWN_SECONDS: "29" }),
    />=30/,
  );
});
