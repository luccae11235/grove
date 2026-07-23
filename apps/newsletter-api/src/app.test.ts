import assert from "node:assert/strict";
import { test } from "node:test";
import type { WebhookEventPayload } from "resend";
import { createApp } from "./app.js";
import { MemoryNewsletterRepository } from "./memoryRepository.js";
import type {
  BroadcastMessage,
  ConfirmationMessage,
  NewsletterProvider,
} from "./provider.js";

class FakeProvider implements NewsletterProvider {
  confirmations: ConfirmationMessage[] = [];
  contacts = new Map<string, string>();
  webhookEvent: WebhookEventPayload = {
    type: "email.delivered",
    created_at: "2026-07-18T12:00:00.000Z",
    data: {
      created_at: "2026-07-18T12:00:00.000Z",
      email_id: "email_1",
      from: "Grove <letters@example.com>",
      to: ["reader@example.com"],
      subject: "Issue",
    },
  };

  async sendConfirmation(message: ConfirmationMessage) {
    this.confirmations.push(message);
  }

  async upsertContact(email: string) {
    const id = this.contacts.get(email) ?? `contact_${this.contacts.size + 1}`;
    this.contacts.set(email, id);
    return id;
  }

  verifyWebhook() {
    return this.webhookEvent;
  }

  async assertSegmentRecipientsAllowed(_allowlist: string[]) {}

  async createBroadcast(_message: BroadcastMessage) {
    return "broadcast_1";
  }

  async updateBroadcast(_providerBroadcastId: string, _message: BroadcastMessage) {}
  async sendBroadcast(_providerBroadcastId: string, _scheduledAt?: string) {}
}

function testSystem(overrides: { rateLimitMax?: number; recipientAllowlist?: string[] } = {}) {
  const repository = new MemoryNewsletterRepository();
  const provider = new FakeProvider();
  const app = createApp({
    repository,
    provider,
    webUrl: "https://grove.example",
    apiPublicUrl: "https://letters.grove.example",
    allowedOrigins: ["https://grove.example"],
    recipientAllowlist: overrides.recipientAllowlist,
    eventHashSalt: "a-secret-test-salt-longer-than-sixteen",
    rateLimitMax: overrides.rateLimitMax ?? 5,
    now: () => new Date("2026-07-18T12:00:00.000Z"),
  });
  return { app, repository, provider };
}

test("recipient allowlist accepts configured addresses and silently ignores all others", async () => {
  const { app, repository, provider } = testSystem({
    recipientAllowlist: ["allowed@example.com"],
  });
  const blocked = await subscribe(app, { email: "other@example.com" });
  assert.equal(blocked.status, 202);
  assert.equal(repository.subscribers.size, 0);
  assert.equal(provider.confirmations.length, 0);

  const allowed = await subscribe(app, { email: "Allowed@Example.com" }, "198.51.100.2");
  assert.equal(allowed.status, 202);
  assert.equal(repository.subscribers.get("allowed@example.com")?.status, "pending");
  assert.equal(provider.confirmations.length, 1);
});

test("double opt-in activates a pending subscriber and avoids duplicate confirmation", async () => {
  const { app, repository, provider } = testSystem();
  const response = await subscribe(app, { email: " Reader@Example.com " });
  assert.equal(response.status, 202);
  assert.equal(provider.confirmations.length, 1);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "pending");

  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  const confirmation = await app.request(`${confirmationUrl.pathname}${confirmationUrl.search}`);
  assert.equal(confirmation.status, 303);
  assert.equal(confirmation.headers.get("location"), "https://grove.example/newsletter/confirmed");
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "active");

  await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(provider.confirmations.length, 1);
});

test("honeypot submissions are accepted without storing an address", async () => {
  const { app, repository, provider } = testSystem();
  const response = await subscribe(app, {
    email: "bot@example.com",
    website: "https://spam.example",
  });
  assert.equal(response.status, 202);
  assert.equal(repository.subscribers.size, 0);
  assert.equal(provider.confirmations.length, 0);
});

test("repeated pending requests do not issue a burst of confirmation emails", async () => {
  const { app, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(provider.confirmations.length, 1);
});

test("rate limiting returns retry guidance", async () => {
  const { app } = testSystem({ rateLimitMax: 1 });
  assert.equal((await subscribe(app, { email: "one@example.com" })).status, 202);
  const blocked = await subscribe(app, { email: "two@example.com" });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("invalid confirmation tokens redirect to an explanatory page", async () => {
  const { app } = testSystem();
  const response = await app.request("/v1/subscriptions/confirm?token=not-valid");
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://grove.example/newsletter/confirmed?status=invalid",
  );
});

test("verified webhooks are idempotent and update suppression state", async () => {
  const { app, repository, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  await app.request(`${confirmationUrl.pathname}${confirmationUrl.search}`);

  provider.webhookEvent = {
    type: "email.bounced",
    created_at: "2026-07-18T12:05:00.000Z",
    data: {
      created_at: "2026-07-18T12:05:00.000Z",
      email_id: "email_2",
      broadcast_id: "broadcast_1",
      from: "Grove <letters@example.com>",
      to: ["reader@example.com"],
      subject: "Issue",
      bounce: { message: "mailbox unavailable", subType: "General", type: "Permanent" },
    },
  };
  const first = await webhook(app, "message_1");
  const duplicate = await webhook(app, "message_1");
  assert.equal(first.status, 200);
  assert.deepEqual(await duplicate.json(), { ok: true, duplicate: true });
  assert.equal(repository.events.size, 1);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "bounced");
  assert.notEqual(repository.events.get("message_1")?.recipientHash, "reader@example.com");
});

async function subscribe(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
  ip = "198.51.100.1",
) {
  return app.request("/v1/subscriptions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://grove.example",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ locale: "en", source: "test", ...body }),
  });
}

async function webhook(app: ReturnType<typeof createApp>, id: string) {
  return app.request("/v1/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": "1784376300",
      "svix-signature": "v1,test",
    },
    body: "{}",
  });
}
