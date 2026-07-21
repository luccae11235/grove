import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import type { SubscriberStatus, WebhookRecord } from "./domain.js";
import type { NewsletterProvider } from "./provider.js";
import { FixedWindowRateLimiter } from "./rateLimiter.js";
import type { NewsletterRepository } from "./repository.js";

const subscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.enum(["en", "pt-BR"]).default("en"),
  source: z.string().trim().min(1).max(80).default("website"),
  website: z.string().max(200).optional().default(""),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
});

export interface AppOptions {
  repository: NewsletterRepository;
  provider: NewsletterProvider;
  webUrl: string;
  apiPublicUrl: string;
  allowedOrigins: string[];
  eventHashSalt: string;
  confirmationTtlHours?: number;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
  now?: () => Date;
}

export function createApp(options: AppOptions) {
  const app = new Hono();
  const now = options.now ?? (() => new Date());
  const limiter = new FixedWindowRateLimiter(
    options.rateLimitMax ?? 5,
    (options.rateLimitWindowSeconds ?? 900) * 1000,
    () => now().getTime(),
  );
  const origins = new Set(options.allowedOrigins.map((origin) => origin.replace(/\/$/, "")));

  app.use("*", secureHeaders());
  app.use("/v1/*", cors({
    origin: (origin) => origins.has(origin.replace(/\/$/, "")) ? origin : "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "svix-id", "svix-timestamp", "svix-signature"],
    maxAge: 86400,
  }));
  app.use("/v1/*", bodyLimit({ maxSize: 64 * 1024 }));

  app.use("*", async (context, next) => {
    const startedAt = Date.now();
    const requestId = context.req.header("x-request-id") ?? randomUUID();
    context.header("x-request-id", requestId);
    await next();
    log("request", {
      requestId,
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
      durationMs: Date.now() - startedAt,
    });
  });

  app.get("/health", async (context) => {
    try {
      await options.repository.health();
      return context.json({ status: "ok" });
    } catch (error) {
      log("health_failed", { error: errorName(error) });
      return context.json({ status: "unavailable" }, 503);
    }
  });

  app.post("/v1/subscriptions", async (context) => {
    const ip = clientIp(context.req.header("x-forwarded-for"), context.req.header("x-real-ip"));
    const allowance = limiter.consume(ip);
    if (!allowance.allowed) {
      context.header("Retry-After", String(allowance.retryAfterSeconds));
      return context.json({ ok: false, error: "Too many attempts. Please try again later." }, 429);
    }

    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ ok: false, error: "Expected a JSON request body." }, 400);
    }
    const parsed = subscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return context.json({ ok: false, error: "Please enter a valid email address." }, 400);
    }

    // A filled honeypot receives the same response without creating a record.
    if (parsed.data.website) {
      return accepted(context);
    }

    const token = randomBytes(32).toString("base64url");
    const requestedAt = now();
    const expiresAt = new Date(
      requestedAt.getTime() + (options.confirmationTtlHours ?? 48) * 60 * 60 * 1000,
    );
    const result = await options.repository.requestSubscription({
      subscriberId: randomUUID(),
      email: parsed.data.email,
      locale: parsed.data.locale,
      source: parsed.data.source,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      tokenHash: hashToken(token),
      expiresAt,
      requestedAt,
    });

    if (result.shouldSendConfirmation) {
      await options.provider.sendConfirmation({
        email: parsed.data.email,
        locale: parsed.data.locale,
        confirmationUrl: `${options.apiPublicUrl}/v1/subscriptions/confirm?token=${encodeURIComponent(token)}`,
      });
    }
    return accepted(context);
  });

  app.get("/v1/subscriptions/confirm", async (context) => {
    const token = context.req.query("token");
    if (!token || token.length > 200) {
      return context.redirect(`${options.webUrl}/newsletter/confirmed?status=invalid`, 303);
    }
    const subscriber = await options.repository.findPendingByTokenHash(hashToken(token), now());
    if (!subscriber) {
      return context.redirect(`${options.webUrl}/newsletter/confirmed?status=invalid`, 303);
    }
    const providerContactId = await options.provider.upsertContact(subscriber.email);
    const activated = await options.repository.activateSubscriber(
      subscriber.subscriberId,
      providerContactId,
      now(),
    );
    return context.redirect(
      `${options.webUrl}/newsletter/confirmed${activated ? "" : "?status=invalid"}`,
      303,
    );
  });

  app.post("/v1/webhooks/resend", async (context) => {
    const id = context.req.header("svix-id");
    const timestamp = context.req.header("svix-timestamp");
    const signature = context.req.header("svix-signature");
    if (!id || !timestamp || !signature) {
      return context.json({ ok: false, error: "Missing webhook signature." }, 400);
    }
    const payload = await context.req.text();
    let event;
    try {
      event = options.provider.verifyWebhook(payload, { id, timestamp, signature });
    } catch (error) {
      log("webhook_rejected", { svixId: id, error: errorName(error) });
      return context.json({ ok: false, error: "Invalid webhook signature." }, 400);
    }

    const data = event.data as unknown as Record<string, unknown>;
    const recipient = extractRecipient(data);
    const record: WebhookRecord = {
      svixId: id,
      eventType: event.type,
      eventCreatedAt: new Date(event.created_at),
      providerEmailId: stringValue(data.email_id),
      providerBroadcastId: stringValue(data.broadcast_id),
      recipientHash: recipient ? hashRecipient(recipient, options.eventHashSalt) : undefined,
      clickedUrl: extractClickedUrl(data),
      tags: stringRecord(data.tags),
    };
    const inserted = await options.repository.recordWebhook(record);
    if (inserted && event.type === "email.sent" && record.providerBroadcastId) {
      await options.repository.markBroadcastSent(record.providerBroadcastId);
    }
    if (inserted && recipient) {
      const status = subscriberStatus(event.type, data);
      if (status) {
        await options.repository.markSubscriberStatusByEmail(recipient, status, now());
      }
    }
    return context.json({ ok: true, duplicate: !inserted });
  });

  app.onError((error, context) => {
    log("request_failed", {
      method: context.req.method,
      path: context.req.path,
      error: errorName(error),
    });
    return context.json({ ok: false, error: "The newsletter service is temporarily unavailable." }, 500);
  });

  return app;
}

function accepted(context: Context) {
  return context.json({
    ok: true,
    message: "If this address can subscribe, a confirmation email is on its way.",
  }, 202);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashRecipient(email: string, salt: string) {
  return createHmac("sha256", salt).update(email.toLowerCase()).digest("hex");
}

function clientIp(forwarded?: string, direct?: string) {
  return forwarded?.split(",")[0]?.trim() || direct || "unknown";
}

function extractRecipient(data: Record<string, unknown>): string | undefined {
  if (typeof data.email === "string") return data.email.toLowerCase();
  if (Array.isArray(data.to) && typeof data.to[0] === "string") return data.to[0].toLowerCase();
  return undefined;
}

function extractClickedUrl(data: Record<string, unknown>) {
  if (!data.click || typeof data.click !== "object") return undefined;
  return stringValue((data.click as Record<string, unknown>).link);
}

function subscriberStatus(eventType: string, data: Record<string, unknown>): SubscriberStatus | null {
  if (eventType === "email.complained") return "complained";
  if (eventType === "email.bounced") return "bounced";
  if (eventType === "email.suppressed") return "suppressed";
  if (eventType === "contact.updated" && data.unsubscribed === true) return "unsubscribed";
  if (eventType === "contact.deleted") return "unsubscribed";
  return null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function log(event: string, details: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`);
}
