import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import postgres from "postgres";
import { runMigrations } from "./migrate.js";
import { PostgresNewsletterRepository } from "./postgresRepository.js";

const databaseUrl = process.env.NEWSLETTER_TEST_DATABASE_URL;

test("PostgreSQL migrations preserve old tokens and support recovery actions", {
  skip: !databaseUrl,
}, async () => {
  assert.ok(databaseUrl);
  const schema = `newsletter_recovery_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(databaseUrl, { max: 1 });
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  const scopedUrl = new URL(databaseUrl);
  scopedUrl.searchParams.set("options", `-c search_path=${schema}`);
  const sql = postgres(scopedUrl.toString(), { max: 1 });
  let repository: PostgresNewsletterRepository | undefined;

  try {
    const foundation = await readFile(
      new URL("../migrations/001_newsletter_foundation.sql", import.meta.url),
      "utf8",
    );
    await sql.unsafe(foundation);
    await sql`
      INSERT INTO schema_migrations (migration_name)
      VALUES ('001_newsletter_foundation.sql')
    `;
    const legacySubscriberId = randomUUID();
    await sql`
      INSERT INTO newsletter_subscribers (
        subscriber_id, email, status, locale, source,
        confirmation_token_hash, confirmation_expires_at,
        consent_requested_at, created_at, updated_at
      ) VALUES (
        ${legacySubscriberId}, 'legacy@example.com', 'pending', 'en', 'legacy',
        'legacy-token', '2026-07-20T12:00:00.000Z',
        '2026-07-18T12:00:00.000Z', now(), now()
      )
    `;

    await runMigrations(scopedUrl.toString());
    repository = new PostgresNewsletterRepository(scopedUrl.toString());

    const migrated = await repository.findConfirmationByTokenHash(
      "legacy-token",
      new Date("2026-07-19T12:00:00.000Z"),
    );
    assert.equal(migrated?.subscriber.email, "legacy@example.com");
    assert.equal(migrated?.expired, false);
    const legacyColumns = await sql<{ confirmation_token_hash: string | null }[]>`
      SELECT confirmation_token_hash
      FROM newsletter_subscribers
      WHERE subscriber_id = ${legacySubscriberId}
    `;
    assert.equal(legacyColumns[0]?.confirmation_token_hash, "legacy-token");

    const requestedAt = new Date("2026-07-18T12:00:00.000Z");
    const subscriberId = randomUUID();
    const firstActionId = randomUUID();
    const first = await repository.requestSubscription({
      subscriberId,
      actionId: firstActionId,
      email: "reader@example.com",
      locale: "en",
      source: "integration-test",
      tokenHash: "first-token",
      expiresAt: new Date("2026-07-20T12:00:00.000Z"),
      requestedAt,
      cooldownBefore: new Date("2026-07-18T11:59:00.000Z"),
    });
    assert.equal(first, "send-confirmation");

    const cooldown = await repository.requestSubscription({
      subscriberId: randomUUID(),
      actionId: randomUUID(),
      email: "reader@example.com",
      locale: "en",
      source: "integration-test",
      tokenHash: "cooldown-token",
      expiresAt: new Date("2026-07-20T12:00:30.000Z"),
      requestedAt: new Date("2026-07-18T12:00:30.000Z"),
      cooldownBefore: new Date("2026-07-18T11:59:30.000Z"),
    });
    assert.equal(cooldown, "cooldown");

    const second = await repository.requestSubscription({
      subscriberId: randomUUID(),
      actionId: randomUUID(),
      email: "reader@example.com",
      locale: "en",
      source: "integration-test",
      tokenHash: "second-token",
      expiresAt: new Date("2026-07-20T12:01:01.000Z"),
      requestedAt: new Date("2026-07-18T12:01:01.000Z"),
      cooldownBefore: new Date("2026-07-18T12:00:01.000Z"),
    });
    assert.equal(second, "send-confirmation");

    const unsent = await repository.requestSubscription({
      subscriberId: randomUUID(),
      actionId: randomUUID(),
      email: "reader@example.com",
      locale: "en",
      source: "integration-test",
      tokenHash: "unsent-token",
      expiresAt: new Date("2026-07-20T12:02:02.000Z"),
      requestedAt: new Date("2026-07-18T12:02:02.000Z"),
      cooldownBefore: new Date("2026-07-18T12:01:02.000Z"),
    });
    assert.equal(unsent, "send-confirmation");
    await repository.discardUnsentAction("unsent-token");
    const rollbackToken = await sql<{ confirmation_token_hash: string | null }[]>`
      SELECT confirmation_token_hash
      FROM newsletter_subscribers
      WHERE email = 'reader@example.com'
    `;
    assert.equal(rollbackToken[0]?.confirmation_token_hash, "second-token");

    const oldLink = await repository.findConfirmationByTokenHash(
      "first-token",
      new Date("2026-07-18T12:03:00.000Z"),
    );
    assert.equal(oldLink?.subscriber.actionId, firstActionId);
    assert.ok(oldLink);
    assert.equal(
      await repository.activateSubscriber(
        oldLink.subscriber.subscriberId,
        oldLink.subscriber.actionId,
        "provider-contact",
        new Date("2026-07-18T12:03:00.000Z"),
      ),
      true,
    );

    const managementActionId = randomUUID();
    assert.equal(await repository.requestUnsubscribe({
      actionId: managementActionId,
      email: "reader@example.com",
      locale: "en",
      tokenHash: "unsubscribe-token",
      expiresAt: new Date("2026-07-19T12:03:00.000Z"),
      requestedAt: new Date("2026-07-18T12:03:00.000Z"),
      cooldownBefore: new Date("2026-07-18T12:02:00.000Z"),
    }), "en");
    const unsubscribe = await repository.findUnsubscribeByTokenHash(
      "unsubscribe-token",
      new Date("2026-07-18T12:04:00.000Z"),
    );
    assert.ok(unsubscribe);
    assert.equal(await repository.unsubscribeSubscriber(
      unsubscribe.subscriber.subscriberId,
      unsubscribe.subscriber.actionId,
      new Date("2026-07-18T12:04:00.000Z"),
    ), true);

    const rejoin = await repository.requestSubscription({
      subscriberId: randomUUID(),
      actionId: randomUUID(),
      email: "reader@example.com",
      locale: "en",
      source: "integration-test",
      tokenHash: "rejoin-token",
      expiresAt: new Date("2026-07-20T12:05:00.000Z"),
      requestedAt: new Date("2026-07-18T12:05:00.000Z"),
      cooldownBefore: new Date("2026-07-18T12:04:00.000Z"),
    });
    assert.equal(rejoin, "send-confirmation");
  } finally {
    if (repository) await repository.close();
    await sql.end();
    await admin.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
