import { z } from "zod";

const runtimeSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1),
  RESEND_SEGMENT_ID: z.string().min(1),
  RESEND_TOPIC_ID: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  NEWSLETTER_RECIPIENT_ALLOWLIST: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().optional(),
  ),
  NEWSLETTER_PUBLIC_SIGNUP: z.enum(["true", "false"]).default("false"),
  NEWSLETTER_FROM: z.string().min(3),
  NEWSLETTER_REPLY_TO: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().email().optional(),
  ),
  WEB_URL: z.string().url(),
  API_PUBLIC_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  EVENT_HASH_SALT: z.string().min(16),
  CONFIRMATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(48),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(5),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(10).max(86400).default(900),
});

export type RuntimeConfig = ReturnType<typeof loadConfig>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = runtimeSchema.parse(environment);
  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (allowedOrigins.some((origin) => origin === "*")) {
    throw new Error("ALLOWED_ORIGINS must list explicit origins; wildcard CORS is not allowed.");
  }
  const recipientAllowlist = parseRecipientAllowlist(parsed.NEWSLETTER_RECIPIENT_ALLOWLIST);
  const publicSignup = parsed.NEWSLETTER_PUBLIC_SIGNUP === "true";
  if (!publicSignup && !recipientAllowlist) {
    throw new Error(
      "NEWSLETTER_RECIPIENT_ALLOWLIST is required unless NEWSLETTER_PUBLIC_SIGNUP=true.",
    );
  }
  if (publicSignup && recipientAllowlist) {
    throw new Error(
      "NEWSLETTER_PUBLIC_SIGNUP and NEWSLETTER_RECIPIENT_ALLOWLIST are mutually exclusive.",
    );
  }
  assertPublicOrigin(parsed.WEB_URL, "WEB_URL");
  assertPublicOrigin(parsed.API_PUBLIC_URL, "API_PUBLIC_URL");
  for (const origin of allowedOrigins) assertPublicOrigin(origin, "ALLOWED_ORIGINS");
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    resendApiKey: parsed.RESEND_API_KEY,
    resendWebhookSecret: parsed.RESEND_WEBHOOK_SECRET,
    resendSegmentId: parsed.RESEND_SEGMENT_ID,
    resendTopicId: parsed.RESEND_TOPIC_ID,
    recipientAllowlist,
    publicSignup,
    newsletterFrom: parsed.NEWSLETTER_FROM,
    newsletterReplyTo: parsed.NEWSLETTER_REPLY_TO,
    webUrl: parsed.WEB_URL.replace(/\/$/, ""),
    apiPublicUrl: parsed.API_PUBLIC_URL.replace(/\/$/, ""),
    allowedOrigins,
    eventHashSalt: parsed.EVENT_HASH_SALT,
    confirmationTtlHours: parsed.CONFIRMATION_TTL_HOURS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindowSeconds: parsed.RATE_LIMIT_WINDOW_SECONDS,
  };
}

function parseRecipientAllowlist(value?: string) {
  if (!value) return undefined;
  const emailSchema = z.string().email();
  const addresses = value.split(",").map((address) => address.trim().toLowerCase()).filter(Boolean);
  if (addresses.length === 0) return undefined;
  for (const address of addresses) emailSchema.parse(address);
  return [...new Set(addresses)];
}

function assertPublicOrigin(value: string, name: string) {
  const url = new URL(value);
  const normalized = value.replace(/\/$/, "");
  if (url.origin !== normalized) {
    throw new Error(`${name} must contain an origin without a path.`);
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside local development.`);
  }
}
