import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEPLOYMENT_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  ALLOWED_ORIGINS: z.string().min(1),
  OBSERVABILITY_LINK_SECRET: z.string().min(32),
  CONSENT_VERSION: z.string().trim().min(1).max(40).default("2026-07"),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(1000).default(120),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
});

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.parse(environment);
  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    throw new Error("ALLOWED_ORIGINS must list explicit origins.");
  }
  for (const origin of allowedOrigins) assertOrigin(origin);
  return {
    port: parsed.PORT,
    deploymentEnvironment: parsed.DEPLOYMENT_ENV,
    databaseUrl: parsed.DATABASE_URL,
    allowedOrigins,
    linkSecret: parsed.OBSERVABILITY_LINK_SECRET,
    consentVersion: parsed.CONSENT_VERSION,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindowSeconds: parsed.RATE_LIMIT_WINDOW_SECONDS,
  };
}

function assertOrigin(value: string) {
  const url = new URL(value);
  if (url.origin !== value) throw new Error("ALLOWED_ORIGINS entries must be origins without paths.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("ALLOWED_ORIGINS must use HTTPS outside local development.");
  }
}
