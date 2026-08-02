import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { runMigrations } from "./migrate.js";
import { PostgresObservabilityRepository } from "./postgresRepository.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
let repository: PostgresObservabilityRepository | undefined;

before(async () => {
  if (!databaseUrl) return;
  await runMigrations(databaseUrl);
  const sql = postgres(databaseUrl, { max: 1 });
  await sql`
    TRUNCATE article_feedback, analytics_identity_nonces, analytics_events,
      analytics_page_engagement, analytics_sessions, analytics_visitors,
      analytics_daily_article_rollups CASCADE
  `;
  await sql.end();
  repository = new PostgresObservabilityRepository(databaseUrl);
});

test("PostgreSQL feedback create, retry, update, aggregate, and retention", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(repository);
  const feedbackId = randomUUID();
  const old = new Date("2024-01-01T12:00:00.000Z");
  const input = {
    feedbackId,
    contentId: "decision-trees-from-scratch",
    locale: "en" as const,
    path: "/learn/decision-trees",
    sentiment: "helpful" as const,
    reason: "clear" as const,
    comment: "The example helped.",
    submittedAt: old,
  };
  assert.equal(await repository.createFeedback(input), "created");
  assert.equal(await repository.createFeedback(input), "duplicate");
  assert.equal(await repository.updateFeedback({
    ...input,
    sentiment: "not_helpful",
    reason: "missing_example",
  }), true);
  const aggregate = await repository.sql<{ responses: string }[]>`
    SELECT responses::text FROM observability_article_feedback
    WHERE content_id = ${input.contentId} AND sentiment = 'not_helpful'
  `;
  assert.equal(Number(aggregate[0]?.responses), 1);
  assert.equal(
    (await repository.inspectRetention(new Date("2025-06-01T00:00:00.000Z"))).feedbackComments,
    1,
  );
  await repository.applyRetention(new Date("2025-06-01T00:00:00.000Z"));
  const rows = await repository.sql<{ sentiment: string; comment: string | null }[]>`
    SELECT sentiment, comment FROM article_feedback WHERE feedback_id = ${feedbackId}
  `;
  assert.equal(rows[0]?.sentiment, "not_helpful");
  assert.equal(rows[0]?.comment, null);
});

after(async () => {
  await repository?.close();
});

test("PostgreSQL migration, idempotency, linkage, reporting view, and revocation", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(repository);
  const visitorId = randomUUID();
  const sessionId = randomUUID();
  const eventId = randomUUID();
  const pageViewId = randomUUID();
  const subscriberId = randomUUID();
  const now = new Date("2026-07-28T12:00:00.000Z");
  await repository.registerVisitor(visitorId, "2026-07", now);
  const event = {
    eventId,
    eventName: "page_view" as const,
    occurredAt: now,
    contentType: "article" as const,
    contentId: "decision-trees-from-scratch",
    path: "/learn/decision-trees",
    properties: {},
  };
  const session = {
    sessionId,
    startedAt: now,
    locale: "en" as const,
    deviceClass: "desktop" as const,
  };
  assert.deepEqual(
    await repository.recordEvents(visitorId, session, [event], now),
    { consentActive: true, inserted: 1 },
  );
  assert.deepEqual(
    await repository.recordEvents(visitorId, session, [event], now),
    { consentActive: true, inserted: 0 },
  );
  assert.equal(await repository.upsertEngagement({
    pageViewId,
    visitorId,
    session,
    contentType: "article",
    contentId: "decision-trees-from-scratch",
    locale: "en",
    path: "/learn/decision-trees",
    startedAt: now,
    occurredAt: now,
    engagedMs: 12_000,
    maxScrollPercent: 95,
    completed: true,
  }), true);
  assert.equal(await repository.linkVisitor(visitorId, {
    subscriberId,
    nonce: randomUUID(),
    expiresAt: new Date(now.getTime() + 60_000),
  }, now), true);
  const rows = await repository.sql<{ page_views: string; completions: string }[]>`
    SELECT page_views, completions
    FROM observability_daily_articles
    WHERE content_id = 'decision-trees-from-scratch'
  `;
  assert.equal(Number(rows[0]?.page_views), 1);
  assert.equal(Number(rows[0]?.completions), 1);
  await repository.deleteVisitor(visitorId);
  const remaining = await repository.sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM analytics_events
  `;
  assert.equal(Number(remaining[0]?.count), 0);
});

test("PostgreSQL retention rolls up and removes stale visitor data", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(repository);
  const visitorId = randomUUID();
  const sessionId = randomUUID();
  const old = new Date("2024-01-01T12:00:00.000Z");
  await repository.registerVisitor(visitorId, "v1", old);
  await repository.upsertEngagement({
    pageViewId: randomUUID(),
    visitorId,
    session: {
      sessionId,
      startedAt: old,
      locale: "pt-BR",
      deviceClass: "mobile",
    },
    contentType: "article",
    contentId: "decision-trees-from-scratch",
    locale: "pt-BR",
    path: "/pt-br/learn/decision-trees",
    startedAt: old,
    occurredAt: old,
    engagedMs: 30_000,
    maxScrollPercent: 100,
    completed: true,
  });
  const removed = await repository.applyRetention(new Date("2025-06-01T00:00:00.000Z"));
  assert.equal(removed.visitors, 1);
  assert.equal(removed.engagements, 1);
  const rollups = await repository.sql<{ page_views: string }[]>`
    SELECT page_views::text
    FROM analytics_daily_article_rollups
    WHERE content_id = 'decision-trees-from-scratch' AND locale = 'pt-BR'
  `;
  assert.equal(Number(rollups[0]?.page_views), 1);
});
