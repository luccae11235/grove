import assert from "node:assert/strict";
import { test } from "node:test";
import type { WebhookEventPayload } from "resend";
import { createApp } from "./app.js";
import { MemoryNewsletterRepository } from "./memoryRepository.js";
import type {
  BroadcastMessage,
  ConfirmationMessage,
  NewsletterProvider,
  SubscriptionManagementMessage,
} from "./provider.js";

class FakeProvider implements NewsletterProvider {
  confirmations: ConfirmationMessage[] = [];
  managementMessages: SubscriptionManagementMessage[] = [];
  unsubscribed: string[] = [];
  contacts = new Map<string, string>();
  failNextConfirmation = false;
  failNextManagement = false;
  webhookEvent: WebhookEventPayload = {
    type: "email.delivered",
    created_at: "2026-07-18T12:00:00.000Z",
    data: {
      created_at: "2026-07-18T12:00:00.000Z",
      email_id: "email_1",
      from: "Aflora <letters@example.com>",
      to: ["reader@example.com"],
      subject: "Issue",
    },
  };

  async sendConfirmation(message: ConfirmationMessage) {
    if (this.failNextConfirmation) {
      this.failNextConfirmation = false;
      throw new Error("confirmation provider unavailable");
    }
    this.confirmations.push(message);
  }

  async sendSubscriptionManagement(message: SubscriptionManagementMessage) {
    if (this.failNextManagement) {
      this.failNextManagement = false;
      throw new Error("management provider unavailable");
    }
    this.managementMessages.push(message);
  }

  async upsertContact(email: string) {
    const id = this.contacts.get(email) ?? `contact_${this.contacts.size + 1}`;
    this.contacts.set(email, id);
    return id;
  }

  async unsubscribeContact(email: string) {
    this.unsubscribed.push(email);
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

function testSystem(overrides: {
  rateLimitMax?: number;
  recipientAllowlist?: string[];
  observabilityLinkSecret?: string;
} = {}) {
  const repository = new MemoryNewsletterRepository();
  const provider = new FakeProvider();
  let currentTime = new Date("2026-07-18T12:00:00.000Z");
  const app = createApp({
    repository,
    provider,
    webUrl: "https://aflora.example",
    apiPublicUrl: "https://letters.aflora.example",
    allowedOrigins: ["https://aflora.example"],
    recipientAllowlist: overrides.recipientAllowlist,
    observabilityLinkSecret: overrides.observabilityLinkSecret,
    eventHashSalt: "a-secret-test-salt-longer-than-sixteen",
    confirmationTtlHours: 48,
    actionTtlHours: 24,
    resendCooldownSeconds: 60,
    rateLimitMax: overrides.rateLimitMax ?? 20,
    now: () => currentTime,
  });
  return {
    app,
    repository,
    provider,
    advance(milliseconds: number) {
      currentTime = new Date(currentTime.getTime() + milliseconds);
    },
  };
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

test("successful confirmation includes a short-lived pseudonymous browser link token", async () => {
  const { app, provider } = testSystem({
    observabilityLinkSecret: "observability-test-secret-at-least-32-characters",
  });
  await subscribe(app, { email: "linked@example.com" });
  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  const confirmation = await app.request(confirmationApiPath(confirmationUrl));
  const location = confirmation.headers.get("location") ?? "";
  assert.match(location, /^https:\/\/aflora\.example\/newsletter\/confirmed#grove-link=/);
  const token = decodeURIComponent(location.split("#grove-link=")[1]);
  const [payload] = token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(decoded.version, 1);
  assert.equal(typeof decoded.subscriberId, "string");
  assert.equal(typeof decoded.nonce, "string");
  assert.equal(decoded.expiresAt, Math.floor(new Date("2026-07-18T12:00:00.000Z").getTime() / 1000) + 900);
  assert.equal(JSON.stringify(decoded).includes("linked@example.com"), false);
});

test("double opt-in activates a pending subscriber and privately reports active status", async () => {
  const { app, repository, provider } = testSystem();
  const response = await subscribe(app, { email: " Reader@Example.com " });
  assert.equal(response.status, 202);
  assert.equal(provider.confirmations.length, 1);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "pending");

  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  assert.equal(confirmationUrl.origin, "https://aflora.example");
  assert.equal(confirmationUrl.pathname, "/newsletter/confirm");
  const confirmation = await app.request(confirmationApiPath(confirmationUrl));
  assert.equal(confirmation.status, 303);
  assert.equal(confirmation.headers.get("location"), "https://aflora.example/newsletter/confirmed");
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "active");

  await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(provider.confirmations.length, 1);
  assert.equal(provider.managementMessages.length, 1);
  assert.equal(provider.managementMessages[0].email, "reader@example.com");
});

test("Portuguese subscriptions use localized confirmation and management pages", async () => {
  const { app, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com", locale: "pt-BR" });

  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  assert.equal(confirmationUrl.pathname, "/pt-br/newsletter/confirm");
  const confirmation = await app.request(confirmationApiPath(confirmationUrl));
  assert.equal(confirmation.status, 303);
  assert.equal(
    confirmation.headers.get("location"),
    "https://aflora.example/pt-br/newsletter/confirmed",
  );

  await manage(app, { email: "reader@example.com", locale: "pt-BR" });
  assert.equal(
    new URL(provider.managementMessages[0].unsubscribeUrl).pathname,
    "/pt-br/newsletter/unsubscribe",
  );
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

test("pending requests can resend after a short cooldown without invalidating older links", async () => {
  const { app, provider, advance } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  const first = new URL(provider.confirmations[0].confirmationUrl);

  await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(provider.confirmations.length, 1);

  advance(60_001);
  await subscribe(app, { email: "reader@example.com" }, "198.51.100.3");
  assert.equal(provider.confirmations.length, 2);
  assert.notEqual(provider.confirmations[0].confirmationUrl, provider.confirmations[1].confirmationUrl);

  const confirmation = await app.request(confirmationApiPath(first));
  assert.equal(confirmation.status, 303);
  assert.equal(confirmation.headers.get("location"), "https://aflora.example/newsletter/confirmed");
});

test("a provider failure discards only the unsent token and permits an immediate retry", async () => {
  const { app, repository, provider } = testSystem();
  provider.failNextConfirmation = true;
  const failed = await subscribe(app, { email: "reader@example.com" });
  assert.equal(failed.status, 500);
  assert.equal(repository.actions.size, 0);

  const retry = await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(retry.status, 202);
  assert.equal(provider.confirmations.length, 1);
  assert.equal(repository.actions.size, 1);
});

test("a failed resend does not invalidate a previously delivered confirmation link", async () => {
  const { app, repository, provider, advance } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  const first = new URL(provider.confirmations[0].confirmationUrl);
  advance(60_001);
  provider.failNextConfirmation = true;

  const failedResend = await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(failedResend.status, 500);
  assert.equal(repository.actions.size, 1);

  const confirmation = await app.request(confirmationApiPath(first));
  assert.equal(confirmation.status, 303);
  assert.equal(confirmation.headers.get("location"), "https://aflora.example/newsletter/confirmed");
});

test("expired confirmation links are distinguished from invalid links", async () => {
  const { app, provider, advance } = testSystem();
  await subscribe(app, { email: "reader@example.com", locale: "pt-BR" });
  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  advance(48 * 60 * 60 * 1000 + 1);

  const expired = await app.request(confirmationApiPath(confirmationUrl));
  assert.equal(expired.status, 303);
  assert.equal(
    expired.headers.get("location"),
    "https://aflora.example/pt-br/newsletter/confirmed?status=expired",
  );
  const invalid = await app.request("/v1/subscriptions/confirm?token=not-valid");
  assert.equal(
    invalid.headers.get("location"),
    "https://aflora.example/newsletter/confirmed?status=invalid",
  );
});

test("management requests do not disclose membership and securely unsubscribe active readers", async () => {
  const { app, repository, provider } = testSystem();
  const unknown = await manage(app, { email: "unknown@example.com" });
  assert.equal(unknown.status, 202);
  const unknownBody = await unknown.json();
  assert.equal(provider.managementMessages.length, 0);

  await subscribe(app, { email: "reader@example.com" });
  await app.request(confirmationApiPath(new URL(provider.confirmations[0].confirmationUrl)));
  const management = await manage(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(management.status, 202);
  assert.deepEqual(await management.json(), unknownBody);
  assert.equal(provider.managementMessages.length, 1);

  const managementUrl = new URL(provider.managementMessages[0].unsubscribeUrl);
  const token = managementUrl.searchParams.get("token");
  assert.ok(token);
  const unsubscribeResponse = await unsubscribe(app, token);
  assert.equal(unsubscribeResponse.status, 200);
  assert.deepEqual(await unsubscribeResponse.json(), { ok: true, status: "unsubscribed" });
  assert.deepEqual(provider.unsubscribed, ["reader@example.com"]);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "unsubscribed");

  const repeated = await unsubscribe(app, token);
  assert.equal(repeated.status, 400);
});

test("expired unsubscribe links do not change provider or subscriber state", async () => {
  const { app, repository, provider, advance } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  await app.request(confirmationApiPath(new URL(provider.confirmations[0].confirmationUrl)));
  await manage(app, { email: "reader@example.com" });
  const token = new URL(provider.managementMessages[0].unsubscribeUrl).searchParams.get("token");
  assert.ok(token);
  advance(24 * 60 * 60 * 1000 + 1);

  const expired = await unsubscribe(app, token);
  assert.equal(expired.status, 410);
  assert.deepEqual(await expired.json(), { ok: false, status: "expired" });
  assert.deepEqual(provider.unsubscribed, []);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "active");
});

test("an unsubscribed reader may opt in again through a fresh confirmation", async () => {
  const { app, repository, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  await app.request(confirmationApiPath(new URL(provider.confirmations[0].confirmationUrl)));
  await manage(app, { email: "reader@example.com" }, "198.51.100.2");
  const token = new URL(provider.managementMessages[0].unsubscribeUrl).searchParams.get("token");
  assert.ok(token);
  await unsubscribe(app, token);

  await subscribe(app, { email: "reader@example.com" }, "198.51.100.3");
  assert.equal(provider.confirmations.length, 2);
  assert.equal(repository.subscribers.get("reader@example.com")?.status, "pending");
});

test("complained, bounced, and suppressed addresses are not silently reactivated", async () => {
  for (const status of ["complained", "bounced", "suppressed"] as const) {
    const { app, repository, provider } = testSystem();
    await subscribe(app, { email: "reader@example.com" });
    await repository.markSubscriberStatusByEmail(
      "reader@example.com",
      status,
      new Date("2026-07-18T12:01:00.000Z"),
    );
    await subscribe(app, { email: "reader@example.com" }, "198.51.100.2");
    assert.equal(provider.confirmations.length, 1);
    assert.equal(repository.subscribers.get("reader@example.com")?.status, status);
  }
});

test("management email failures can be retried immediately", async () => {
  const { app, repository, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  await app.request(confirmationApiPath(new URL(provider.confirmations[0].confirmationUrl)));
  provider.failNextManagement = true;
  const failed = await manage(app, { email: "reader@example.com" });
  assert.equal(failed.status, 500);
  assert.equal(
    [...repository.actions.values()].filter((action) => action.actionType === "unsubscribe").length,
    0,
  );

  const retry = await manage(app, { email: "reader@example.com" }, "198.51.100.2");
  assert.equal(retry.status, 202);
  assert.equal(provider.managementMessages.length, 1);
});

test("rate limiting returns retry guidance across subscription operations", async () => {
  const { app } = testSystem({ rateLimitMax: 1 });
  assert.equal((await subscribe(app, { email: "one@example.com" })).status, 202);
  const blocked = await manage(app, { email: "one@example.com" }, "198.51.100.1");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("verified webhooks are idempotent and update suppression state", async () => {
  const { app, repository, provider } = testSystem();
  await subscribe(app, { email: "reader@example.com" });
  const confirmationUrl = new URL(provider.confirmations[0].confirmationUrl);
  await app.request(confirmationApiPath(confirmationUrl));

  provider.webhookEvent = {
    type: "email.bounced",
    created_at: "2026-07-18T12:05:00.000Z",
    data: {
      created_at: "2026-07-18T12:05:00.000Z",
      email_id: "email_2",
      broadcast_id: "broadcast_1",
      from: "Aflora <letters@example.com>",
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
  return app.request("/v1/subscriptions", request(body, ip));
}

async function manage(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
  ip = "198.51.100.10",
) {
  return app.request("/v1/subscriptions/manage", request(body, ip));
}

async function unsubscribe(app: ReturnType<typeof createApp>, token: string) {
  return app.request("/v1/subscriptions/unsubscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://aflora.example",
    },
    body: JSON.stringify({ token }),
  });
}

function request(body: Record<string, unknown>, ip: string) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://aflora.example",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ locale: "en", source: "test", ...body }),
  };
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

function confirmationApiPath(url: URL) {
  return `/v1/subscriptions/confirm${url.search}`;
}
