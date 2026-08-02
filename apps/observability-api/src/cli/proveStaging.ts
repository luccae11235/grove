import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadConfig } from "../config.js";
import { parseArguments } from "./arguments.js";

const requiredConfirmation = "PROVE:staging-observability";
const arguments_ = parseArguments(process.argv.slice(2));
if (arguments_.confirm !== requiredConfirmation) {
  throw new Error(`Re-run with --confirm ${requiredConfirmation}.`);
}
const apiUrl = typeof arguments_["api-url"] === "string"
  ? normalizeOrigin(arguments_["api-url"])
  : "";
if (!apiUrl) throw new Error("--api-url is required.");
const config = loadConfig();
if (config.deploymentEnvironment !== "staging") {
  throw new Error("The observability proof refuses to run outside DEPLOYMENT_ENV=staging.");
}
const sql = postgres(config.databaseUrl, { max: 1, connect_timeout: 10 });
const visitorId = randomUUID();
const sessionId = randomUUID();
const pageViewId = randomUUID();
const eventId = randomUUID();
const feedbackId = randomUUID();
const now = new Date();
const origin = config.allowedOrigins[0];
const checks: Array<{ check: string; status: "passed" }> = [];

try {
  const health = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(15_000) });
  assert(health.status === 200, `health returned HTTP ${health.status}`);
  checks.push({ check: "health reaches the staging analytics schema", status: "passed" });

  const beforeConsent = await request("/v1/events", "POST", eventBatch());
  assert(beforeConsent.status === 403, "pre-consent ingestion was not rejected");
  checks.push({ check: "pre-consent ingestion is rejected", status: "passed" });

  assert((await request("/v1/feedback", "POST", feedback("helpful", "clear"))).status === 201,
    "anonymous feedback was not accepted");
  assert((await request("/v1/feedback", "POST", feedback("helpful", "clear"))).status === 200,
    "feedback retry was not idempotent");
  assert((await request(
    `/v1/feedback/${feedbackId}`,
    "PUT",
    feedback("not_helpful", "confusing"),
  )).status === 200, "feedback update was not accepted");
  const feedbackRows = await sql<{ sentiment: string; reason: string | null }[]>`
    SELECT sentiment, reason FROM article_feedback WHERE feedback_id = ${feedbackId}
  `;
  assert(feedbackRows[0]?.sentiment === "not_helpful", "feedback update was not persisted");
  assert(feedbackRows[0]?.reason === "confusing", "feedback reason was not persisted");
  checks.push({
    check: "anonymous feedback persists, retries safely, and updates without analytics consent",
    status: "passed",
  });

  assert((await request("/v1/visitors", "POST", {
    visitorId,
    consentVersion: config.consentVersion,
  })).status === 201, "visitor consent was not accepted");
  assert((await request("/v1/events", "POST", eventBatch())).status === 200, "event was not accepted");
  assert((await request(`/v1/engagement/${pageViewId}`, "PUT", {
    visitorId,
    session: session(),
    contentType: "article",
    contentId: "staging-observability-proof",
    locale: "en",
    path: "/staging-observability-proof",
    startedAt: now.toISOString(),
    occurredAt: now.toISOString(),
    engagedMs: 12_000,
    maxScrollPercent: 95,
    completed: true,
  })).status === 200, "engagement was not accepted");
  const rows = await sql<{ event_count: string; engagement_count: string }[]>`
    SELECT
      (SELECT count(*) FROM analytics_events WHERE visitor_id = ${visitorId}) AS event_count,
      (SELECT count(*) FROM analytics_page_engagement WHERE visitor_id = ${visitorId}) AS engagement_count
  `;
  assert(Number(rows[0]?.event_count) === 1, "staging event was not persisted");
  assert(Number(rows[0]?.engagement_count) === 1, "staging engagement was not persisted");
  checks.push({ check: "consented event and engagement persist end to end", status: "passed" });

  assert((await fetch(`${apiUrl}/v1/visitors/${visitorId}`, {
    method: "DELETE",
    headers: { Origin: origin },
    signal: AbortSignal.timeout(15_000),
  })).status === 204, "visitor revocation failed");
  const remaining = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM analytics_visitors WHERE visitor_id = ${visitorId}
  `;
  assert(Number(remaining[0]?.count) === 0, "revocation did not delete visitor data");
  checks.push({ check: "revocation deletes the synthetic visitor and activity", status: "passed" });

  process.stdout.write(`${JSON.stringify({ ok: true, apiUrl, checks }, null, 2)}\n`);
} finally {
  await sql`DELETE FROM article_feedback WHERE feedback_id = ${feedbackId}`;
  await sql`DELETE FROM analytics_visitors WHERE visitor_id = ${visitorId}`;
  await sql.end();
}

function feedback(sentiment: "helpful" | "not_helpful", reason: "clear" | "confusing") {
  return {
    feedbackId,
    contentId: "staging-observability-proof",
    locale: "en",
    path: "/staging-observability-proof",
    sentiment,
    reason,
    comment: "Self-cleaning staging proof.",
  };
}

function eventBatch() {
  return {
    visitorId,
    session: session(),
    events: [{
      eventId,
      eventName: "page_view",
      occurredAt: now.toISOString(),
      contentType: "article",
      contentId: "staging-observability-proof",
      path: "/staging-observability-proof",
      properties: {},
    }],
  };
}

function session() {
  return {
    sessionId,
    startedAt: now.toISOString(),
    locale: "en",
    deviceClass: "desktop",
  };
}

async function request(path: string, method: "POST" | "PUT", body: unknown) {
  return fetch(`${apiUrl}${path}`, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}

function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (url.origin !== value.replace(/\/$/, "")) throw new Error("--api-url must be an origin.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("--api-url must use HTTPS outside local development.");
  }
  return url.origin;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
