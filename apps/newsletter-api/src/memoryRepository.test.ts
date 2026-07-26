import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryNewsletterRepository } from "./memoryRepository.js";

test("issue metrics use unique recipients and preserve top-link detail", async () => {
  const repository = new MemoryNewsletterRepository();
  await repository.recordBroadcast({
    issueId: "2026-001",
    providerBroadcastId: "broadcast_1",
    status: "sent",
    subject: "Issue",
  });
  const events = [
    ["1", "email.sent", "reader-a"],
    ["2", "email.delivered", "reader-a"],
    ["3", "email.opened", "reader-a"],
    ["4", "email.opened", "reader-a"],
    ["5", "email.clicked", "reader-a", "https://grove.example/article"],
    ["6", "email.clicked", "reader-a", "https://grove.example/article"],
  ] as const;
  for (const [svixId, eventType, recipientHash, clickedUrl] of events) {
    await repository.recordWebhook({
      svixId,
      eventType,
      eventCreatedAt: new Date(),
      providerBroadcastId: "broadcast_1",
      recipientHash,
      clickedUrl,
      tags: {},
    });
  }
  const metrics = await repository.getIssueMetrics("2026-001");
  assert.equal(metrics.sent, 1);
  assert.equal(metrics.uniqueOpened, 1);
  assert.equal(metrics.uniqueClicked, 1);
  assert.equal(metrics.uniqueOpenRate, 1);
  assert.deepEqual(metrics.topLinks, [
    { url: "https://grove.example/article", uniqueClicks: 1 },
  ]);
});

test("retention removes only stale pending consent and old telemetry", async () => {
  const repository = new MemoryNewsletterRepository();
  const old = new Date("2024-01-01T00:00:00.000Z");
  const recent = new Date("2026-07-01T00:00:00.000Z");
  await repository.requestSubscription({
    subscriberId: "old-pending",
    actionId: "old-pending-action",
    email: "pending@example.com",
    locale: "en",
    source: "test",
    tokenHash: "old-token",
    expiresAt: new Date("2024-01-03T00:00:00.000Z"),
    requestedAt: old,
    cooldownBefore: new Date("2023-12-31T23:59:00.000Z"),
  });
  await repository.requestSubscription({
    subscriberId: "active",
    actionId: "active-action",
    email: "active@example.com",
    locale: "en",
    source: "test",
    tokenHash: "active-token",
    expiresAt: new Date("2024-01-03T00:00:00.000Z"),
    requestedAt: old,
    cooldownBefore: new Date("2023-12-31T23:59:00.000Z"),
  });
  await repository.activateSubscriber("active", "active-action", "provider-active", old);
  await repository.recordWebhook({
    svixId: "old-event",
    eventType: "email.delivered",
    eventCreatedAt: old,
    tags: {},
  });
  await repository.recordWebhook({
    svixId: "recent-event",
    eventType: "email.delivered",
    eventCreatedAt: recent,
    tags: {},
  });

  const removed = await repository.applyRetention(
    new Date("2026-06-01T00:00:00.000Z"),
    new Date("2025-06-01T00:00:00.000Z"),
  );
  assert.deepEqual(removed, { pendingSubscribers: 1, events: 1 });
  assert.equal(repository.subscribers.has("pending@example.com"), false);
  assert.equal(repository.subscribers.get("active@example.com")?.status, "active");
  assert.deepEqual([...repository.events.keys()], ["recent-event"]);
});
