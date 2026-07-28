import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { runMigrations } from "./migrate.js";
import { PostgresNewsletterRepository } from "./postgresRepository.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
let repository: PostgresNewsletterRepository | undefined;
let sql: ReturnType<typeof postgres> | undefined;

before(async () => {
  if (!databaseUrl) return;
  await runMigrations(databaseUrl);
  sql = postgres(databaseUrl, { max: 1 });
  await sql`
    TRUNCATE newsletter_subscriber_events, newsletter_events,
      newsletter_broadcasts, newsletter_subscribers CASCADE
  `;
  repository = new PostgresNewsletterRepository(databaseUrl);
});

after(async () => {
  await repository?.close();
  if (sql) {
    await sql`
      TRUNCATE newsletter_subscriber_events, newsletter_events,
        newsletter_broadcasts, newsletter_subscribers CASCADE
    `;
    await sql.end();
  }
});

test("PostgreSQL lifecycle backfill is idempotent and state transitions are atomic", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(repository);
  assert.ok(sql);
  const historicalId = randomUUID();
  const historicalAt = new Date("2025-01-02T03:04:05.000Z");
  await sql`
    INSERT INTO newsletter_subscribers (
      subscriber_id, email, status, locale, source, confirmed_at,
      consent_requested_at, created_at, updated_at
    ) VALUES (
      ${historicalId}, 'historical@example.com', 'active', 'en', 'integration',
      ${historicalAt}, ${historicalAt}, ${historicalAt}, ${historicalAt}
    )
  `;
  await sql`DELETE FROM schema_migrations WHERE migration_name = '002_subscriber_lifecycle.sql'`;
  await runMigrations(databaseUrl);
  await sql`DELETE FROM schema_migrations WHERE migration_name = '002_subscriber_lifecycle.sql'`;
  await runMigrations(databaseUrl);
  const backfill = await sql<{ count: string; occurred_at: Date }[]>`
    SELECT count(*)::text AS count, min(occurred_at) AS occurred_at
    FROM newsletter_subscriber_events
    WHERE subscriber_id = ${historicalId} AND event_type = 'status_backfilled'
  `;
  assert.equal(Number(backfill[0]?.count), 1);
  assert.equal(backfill[0]?.occurred_at.toISOString(), historicalAt.toISOString());

  const subscriberId = randomUUID();
  const actionId = randomUUID();
  const requestedAt = new Date("2026-07-01T12:00:00.000Z");
  await repository.requestSubscription({
    subscriberId,
    actionId,
    email: "lifecycle@example.com",
    locale: "pt-BR",
    source: "integration",
    tokenHash: "integration-token",
    expiresAt: new Date("2026-07-03T12:00:00.000Z"),
    requestedAt,
    cooldownBefore: new Date("2026-07-01T11:59:00.000Z"),
  });
  assert.equal(
    await repository.activateSubscriber(
      subscriberId,
      actionId,
      "contact-integration",
      new Date("2026-07-01T12:05:00.000Z"),
    ),
    true,
  );
  const webhook = {
    svixId: "integration-bounce",
    eventType: "email.bounced",
    eventCreatedAt: new Date("2026-07-02T12:00:00.000Z"),
    tags: {},
  };
  assert.equal(await repository.recordWebhook(webhook, {
    email: "lifecycle@example.com",
    status: "bounced",
  }), true);
  assert.equal(await repository.recordWebhook(webhook, {
    email: "lifecycle@example.com",
    status: "bounced",
  }), false);
  const state = await sql<{ status: string; event_types: string[] }[]>`
    SELECT
      s.status,
      array_agg(e.event_type ORDER BY e.occurred_at) AS event_types
    FROM newsletter_subscribers s
    JOIN newsletter_subscriber_events e USING (subscriber_id)
    WHERE s.subscriber_id = ${subscriberId}
    GROUP BY s.status
  `;
  assert.equal(state[0]?.status, "bounced");
  assert.deepEqual(state[0]?.event_types, [
    "subscription_requested",
    "confirmed",
    "bounced",
  ]);
});

test("newsletter retention removes stale email data but preserves consent history", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(repository);
  assert.ok(sql);
  const subscriberId = randomUUID();
  const old = new Date("2024-01-01T00:00:00.000Z");
  await repository.requestSubscription({
    subscriberId,
    actionId: randomUUID(),
    email: "stale-pending@example.com",
    locale: "en",
    source: "integration",
    tokenHash: "stale-pending-token",
    expiresAt: new Date("2024-01-03T00:00:00.000Z"),
    requestedAt: old,
    cooldownBefore: new Date("2023-12-31T23:59:00.000Z"),
  });
  const removed = await repository.applyRetention(
    new Date("2025-01-01T00:00:00.000Z"),
    new Date("2025-01-01T00:00:00.000Z"),
  );
  assert.equal(removed.pendingSubscribers, 1);
  const records = await sql<{ subscribers: string; lifecycle: string }[]>`
    SELECT
      (SELECT count(*) FROM newsletter_subscribers WHERE subscriber_id = ${subscriberId}) AS subscribers,
      (SELECT count(*) FROM newsletter_subscriber_events WHERE subscriber_id = ${subscriberId}) AS lifecycle
  `;
  assert.equal(Number(records[0]?.subscribers), 0);
  assert.equal(Number(records[0]?.lifecycle), 1);
});
