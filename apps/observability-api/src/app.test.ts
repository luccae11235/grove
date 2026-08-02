import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createApp } from "./app.js";
import { MemoryObservabilityRepository } from "./memoryRepository.js";

const now = new Date("2026-07-28T12:00:00.000Z");
const secret = "observability-test-secret-at-least-32-characters";

test("health and CORS expose only the configured website origin", async () => {
  const { app } = system();
  assert.equal((await app.request("/health")).status, 200);
  const allowed = await app.request("/v1/visitors", {
    method: "OPTIONS",
    headers: {
      Origin: "https://grove.example",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://grove.example");
  const rejected = await app.request("/v1/visitors", {
    method: "OPTIONS",
    headers: {
      Origin: "https://untrusted.invalid",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("events require consent and remain idempotent", async () => {
  const { app, repository } = system();
  const visitorId = randomUUID();
  const sessionId = randomUUID();
  const eventId = randomUUID();
  const body = eventBatch(visitorId, sessionId, eventId);
  const beforeConsent = await jsonRequest(app, "/v1/events", "POST", body);
  assert.equal(beforeConsent.status, 403);

  const consent = await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "2026-07",
  });
  assert.equal(consent.status, 201);
  const first = await jsonRequest(app, "/v1/events", "POST", body);
  assert.equal(first.status, 200);
  assert.equal(((await first.json()) as { accepted: number }).accepted, 1);
  const duplicate = await jsonRequest(app, "/v1/events", "POST", body);
  assert.equal(duplicate.status, 200);
  assert.equal(((await duplicate.json()) as { accepted: number }).accepted, 0);
  assert.equal(repository.events.size, 1);
});

test("engagement accepts only increasing cumulative summaries", async () => {
  const { app, repository } = system();
  const visitorId = randomUUID();
  const sessionId = randomUUID();
  const pageViewId = randomUUID();
  await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "2026-07",
  });
  const base = {
    visitorId,
    session: {
      sessionId,
      startedAt: now.toISOString(),
      locale: "en",
      deviceClass: "desktop",
    },
    contentType: "article",
    contentId: "decision-trees-from-scratch",
    locale: "en",
    path: "/learn/decision-trees",
    startedAt: now.toISOString(),
    occurredAt: now.toISOString(),
    engagedMs: 20_000,
    maxScrollPercent: 50,
    completed: false,
  };
  assert.equal(
    (await jsonRequest(app, `/v1/engagement/${pageViewId}`, "PUT", base)).status,
    200,
  );
  await jsonRequest(app, `/v1/engagement/${pageViewId}`, "PUT", {
    ...base,
    engagedMs: 10_000,
    maxScrollPercent: 25,
  });
  const stored = repository.engagements.get(pageViewId);
  assert.equal(stored?.engagedMs, 20_000);
  assert.equal(stored?.maxScrollPercent, 50);
});

test("identity links are signed, expiring, single-use, and contain no email", async () => {
  const { app, repository } = system();
  const visitorId = randomUUID();
  const subscriberId = randomUUID();
  await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "2026-07",
  });
  const token = identityToken(subscriberId, new Date(now.getTime() + 60_000));
  assert.equal(token.includes("@"), false);
  const first = await jsonRequest(app, "/v1/identity/link", "POST", { visitorId, token });
  assert.equal(first.status, 200);
  assert.equal(repository.visitors.get(visitorId)?.subscriberId, subscriberId);
  const replay = await jsonRequest(app, "/v1/identity/link", "POST", { visitorId, token });
  assert.equal(replay.status, 409);

  const tampered = await jsonRequest(app, "/v1/identity/link", "POST", {
    visitorId,
    token: `${token}x`,
  });
  assert.equal(tampered.status, 400);
  const expired = await jsonRequest(app, "/v1/identity/link", "POST", {
    visitorId,
    token: identityToken(subscriberId, new Date(now.getTime() - 1)),
  });
  assert.equal(expired.status, 400);
});

test("revocation deletes visitor activity and future ingestion is rejected", async () => {
  const { app, repository } = system();
  const visitorId = randomUUID();
  const sessionId = randomUUID();
  await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "2026-07",
  });
  await jsonRequest(app, "/v1/events", "POST", eventBatch(visitorId, sessionId, randomUUID()));
  assert.equal((await app.request(`/v1/visitors/${visitorId}`, { method: "DELETE" })).status, 204);
  assert.equal(repository.visitors.has(visitorId), false);
  assert.equal(repository.events.size, 0);
  assert.equal(
    (await jsonRequest(
      app,
      "/v1/events",
      "POST",
      eventBatch(visitorId, sessionId, randomUUID()),
    )).status,
    403,
  );
});

test("event properties, paths, time bounds, and request rates are bounded", async () => {
  const { app } = system({ rateLimitMax: 2 });
  const visitorId = randomUUID();
  assert.equal((await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "wrong",
  })).status, 400);
  assert.equal((await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId,
    consentVersion: "2026-07",
  })).status, 201);
  const rateLimited = await jsonRequest(app, "/v1/visitors", "POST", {
    visitorId: randomUUID(),
    consentVersion: "2026-07",
  });
  assert.equal(rateLimited.status, 429);
});

test("feedback works without analytics consent and supports retry and update", async () => {
  const { app, repository } = system();
  const feedbackId = randomUUID();
  const body = feedbackBody(feedbackId);
  const created = await jsonRequest(app, "/v1/feedback", "POST", body);
  assert.equal(created.status, 201);
  assert.equal(repository.feedback.get(feedbackId)?.sentiment, "helpful");

  assert.equal((await jsonRequest(app, "/v1/feedback", "POST", body)).status, 200);
  assert.equal(repository.feedback.size, 1);

  const conflicting = await jsonRequest(app, "/v1/feedback", "POST", {
    ...body,
    contentId: "another-article",
  });
  assert.equal(conflicting.status, 409);

  const updated = await jsonRequest(app, `/v1/feedback/${feedbackId}`, "PUT", {
    ...body,
    sentiment: "not_helpful",
    reason: "confusing",
    comment: "The ending moved too quickly.",
  });
  assert.equal(updated.status, 200);
  assert.equal(repository.feedback.get(feedbackId)?.reason, "confusing");
});

test("feedback accepts only bounded article data", async () => {
  const { app } = system();
  const feedbackId = randomUUID();
  assert.equal((await jsonRequest(app, "/v1/feedback", "POST", {
    ...feedbackBody(feedbackId),
    comment: "x".repeat(501),
  })).status, 400);
  assert.equal((await jsonRequest(app, "/v1/feedback", "POST", {
    ...feedbackBody(randomUUID()),
    comment: "unsafe\u001bterminal sequence",
  })).status, 400);
  assert.equal((await jsonRequest(app, "/v1/feedback", "POST", {
    ...feedbackBody(randomUUID()),
    reason: "arbitrary",
  })).status, 400);
  assert.equal((await jsonRequest(app, "/v1/feedback", "POST", {
    ...feedbackBody(randomUUID()),
    path: "/learn/decision-trees?private=value",
  })).status, 400);
  assert.equal((await jsonRequest(app, `/v1/feedback/${randomUUID()}`, "PUT", {
    ...feedbackBody(randomUUID()),
  })).status, 400);
});

function system(overrides: Partial<Parameters<typeof createApp>[0]> = {}) {
  const repository = new MemoryObservabilityRepository();
  const app = createApp({
    repository,
    allowedOrigins: ["https://grove.example"],
    linkSecret: secret,
    consentVersion: "2026-07",
    now: () => now,
    ...overrides,
  });
  return { app, repository };
}

function eventBatch(visitorId: string, sessionId: string, eventId: string) {
  return {
    visitorId,
    session: {
      sessionId,
      startedAt: now.toISOString(),
      locale: "en",
      deviceClass: "desktop",
    },
    events: [{
      eventId,
      eventName: "page_view",
      occurredAt: now.toISOString(),
      contentType: "article",
      contentId: "decision-trees-from-scratch",
      path: "/learn/decision-trees",
      properties: {},
    }],
  };
}

function feedbackBody(feedbackId: string) {
  return {
    feedbackId,
    contentId: "decision-trees-from-scratch",
    locale: "en",
    path: "/learn/decision-trees",
    sentiment: "helpful",
    reason: "clear",
    comment: "The split animation made this click.",
  };
}

async function jsonRequest(
  app: ReturnType<typeof createApp>,
  path: string,
  method: "POST" | "PUT",
  body: unknown,
) {
  return app.request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://grove.example",
    },
    body: JSON.stringify(body),
  });
}

function identityToken(subscriberId: string, expiresAt: Date) {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    subscriberId,
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
    nonce: randomUUID(),
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
