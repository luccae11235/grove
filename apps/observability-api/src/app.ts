import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { eventNames, type AnalyticsEventInput, type EngagementInput } from "./domain.js";
import { verifyIdentityLinkToken } from "./identityToken.js";
import type { ObservabilityRepository } from "./repository.js";

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const locale = z.enum(["en", "pt-BR"]);
const deviceClass = z.enum(["mobile", "tablet", "desktop"]);
const contentType = z.enum(["page", "article", "issue"]);
const safeText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => safeText(maximum).optional();
const path = z.string().startsWith("/").max(300).refine(
  (value) => !value.includes("?") && !value.includes("#"),
  "path must not include a query or fragment",
);
const properties = z.record(
  z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  z.union([z.string().max(160), z.number().finite(), z.boolean()]),
).refine((value) => Object.keys(value).length <= 12, "too many event properties");
const sessionSchema = z.object({
  sessionId: uuid,
  startedAt: timestamp,
  locale,
  deviceClass,
});
const eventSchema = z.object({
  eventId: uuid,
  eventName: z.enum(eventNames),
  occurredAt: timestamp,
  contentType: contentType.optional(),
  contentId: optionalText(120),
  path,
  referrer: optionalText(200),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
  properties: properties.default({}),
});
const visitorSchema = z.object({
  visitorId: uuid,
  consentVersion: safeText(40),
});
const eventsSchema = z.object({
  visitorId: uuid,
  session: sessionSchema,
  events: z.array(eventSchema).min(1).max(25),
});
const engagementSchema = z.object({
  visitorId: uuid,
  session: sessionSchema,
  contentType,
  contentId: optionalText(120),
  locale,
  path,
  startedAt: timestamp,
  occurredAt: timestamp,
  engagedMs: z.number().int().min(0).max(24 * 60 * 60 * 1000),
  maxScrollPercent: z.number().int().min(0).max(100),
  completed: z.boolean(),
  referrer: optionalText(200),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
});
const linkSchema = z.object({
  visitorId: uuid,
  token: z.string().min(40).max(1000),
});

export interface AppOptions {
  repository: ObservabilityRepository;
  allowedOrigins: string[];
  linkSecret: string;
  consentVersion: string;
  deploymentEnvironment?: string;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
  now?: () => Date;
}

export function createApp(options: AppOptions) {
  const app = new Hono();
  const now = options.now ?? (() => new Date());
  const origins = new Set(options.allowedOrigins.map((origin) => origin.replace(/\/$/, "")));
  const limiter = new FixedWindowLimiter(
    options.rateLimitMax ?? 120,
    (options.rateLimitWindowSeconds ?? 60) * 1000,
    () => now().getTime(),
  );

  app.use("*", secureHeaders());
  app.use("/v1/*", cors({
    origin: (origin) => origins.has(origin.replace(/\/$/, "")) ? origin : "",
    allowMethods: ["POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  }));
  app.use("/v1/*", bodyLimit({ maxSize: 32 * 1024 }));
  app.use("*", async (context, next) => {
    const startedAt = Date.now();
    const requestId = context.req.header("x-request-id") ?? randomUUID();
    context.header("x-request-id", requestId);
    await next();
    log("request", {
      environment: options.deploymentEnvironment ?? "development",
      requestId,
      method: context.req.method,
      route: context.req.routePath,
      status: context.res.status,
      durationMs: Date.now() - startedAt,
    });
  });
  app.use("/v1/*", async (context, next) => {
    if (context.req.method === "OPTIONS") return next();
    const key = clientIp(
      context.req.header("x-forwarded-for"),
      context.req.header("x-real-ip"),
    );
    const allowance = limiter.consume(key);
    if (!allowance.allowed) {
      context.header("Retry-After", String(allowance.retryAfterSeconds));
      return context.json({ ok: false, error: "Too many analytics requests." }, 429);
    }
    return next();
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

  app.post("/v1/visitors", async (context) => {
    const parsed = visitorSchema.safeParse(await readJson(context.req.raw));
    if (!parsed.success || parsed.data.consentVersion !== options.consentVersion) {
      return context.json({ ok: false, error: "Invalid analytics consent." }, 400);
    }
    await options.repository.registerVisitor(
      parsed.data.visitorId,
      parsed.data.consentVersion,
      now(),
    );
    return context.json({ ok: true }, 201);
  });

  app.post("/v1/events", async (context) => {
    const parsed = eventsSchema.safeParse(await readJson(context.req.raw));
    if (!parsed.success || !validTimes(
      parsed.data.events.map((event) => event.occurredAt),
      now(),
    )) {
      return context.json({ ok: false, error: "Invalid analytics events." }, 400);
    }
    const result = await options.repository.recordEvents(
      parsed.data.visitorId,
      parsed.data.session,
      parsed.data.events as AnalyticsEventInput[],
      now(),
    );
    if (!result.consentActive) {
      return context.json({ ok: false, error: "Analytics consent is not active." }, 403);
    }
    return context.json({ ok: true, accepted: result.inserted });
  });

  app.put("/v1/engagement/:pageViewId", async (context) => {
    const pageViewId = uuid.safeParse(context.req.param("pageViewId"));
    const parsed = engagementSchema.safeParse(await readJson(context.req.raw));
    if (
      !pageViewId.success ||
      !parsed.success ||
      !validTimes([parsed.data.startedAt, parsed.data.occurredAt], now()) ||
      parsed.data.occurredAt < parsed.data.startedAt
    ) {
      return context.json({ ok: false, error: "Invalid engagement summary." }, 400);
    }
    const accepted = await options.repository.upsertEngagement({
      ...parsed.data,
      pageViewId: pageViewId.data,
    } as EngagementInput);
    if (!accepted) {
      return context.json({ ok: false, error: "Analytics consent is not active." }, 403);
    }
    return context.json({ ok: true });
  });

  app.post("/v1/identity/link", async (context) => {
    const parsed = linkSchema.safeParse(await readJson(context.req.raw));
    if (!parsed.success) {
      return context.json({ ok: false, error: "Invalid identity link." }, 400);
    }
    const link = verifyIdentityLinkToken(parsed.data.token, options.linkSecret, now());
    if (!link) {
      return context.json({ ok: false, error: "Identity link is invalid or expired." }, 400);
    }
    const linked = await options.repository.linkVisitor(parsed.data.visitorId, link, now());
    if (!linked) {
      return context.json({ ok: false, error: "Identity link was already used." }, 409);
    }
    return context.json({ ok: true });
  });

  app.delete("/v1/visitors/:visitorId", async (context) => {
    const visitorId = uuid.safeParse(context.req.param("visitorId"));
    if (!visitorId.success) {
      return context.json({ ok: false, error: "Invalid visitor identifier." }, 400);
    }
    await options.repository.deleteVisitor(visitorId.data);
    return context.body(null, 204);
  });

  app.onError((error, context) => {
    log("request_failed", {
      environment: options.deploymentEnvironment ?? "development",
      method: context.req.method,
      route: context.req.routePath,
      error: errorName(error),
    });
    return context.json({ ok: false, error: "The observability service is unavailable." }, 500);
  });

  return app;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validTimes(values: Date[], reference: Date) {
  const earliest = reference.getTime() - 7 * 24 * 60 * 60 * 1000;
  const latest = reference.getTime() + 5 * 60 * 1000;
  return values.every((value) => value.getTime() >= earliest && value.getTime() <= latest);
}

function clientIp(forwarded?: string, direct?: string) {
  return forwarded?.split(",")[0]?.trim() || direct || "unknown";
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function log(event: string, details: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`);
}

class FixedWindowLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maximum: number,
    private readonly windowMs: number,
    private readonly clock: () => number,
  ) {}

  consume(key: string) {
    const currentTime = this.clock();
    const current = this.windows.get(key);
    if (!current || current.resetAt <= currentTime) {
      this.windows.set(key, { count: 1, resetAt: currentTime + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    current.count += 1;
    if (current.count <= this.maximum) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
    };
  }
}
