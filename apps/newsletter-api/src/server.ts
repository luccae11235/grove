import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { PostgresNewsletterRepository } from "./postgresRepository.js";
import { ResendNewsletterProvider } from "./provider.js";

const config = loadConfig();
const repository = new PostgresNewsletterRepository(config.databaseUrl);
const provider = new ResendNewsletterProvider({
  apiKey: config.resendApiKey,
  webhookSecret: config.resendWebhookSecret,
  segmentId: config.resendSegmentId,
  topicId: config.resendTopicId,
  from: config.newsletterFrom,
  replyTo: config.newsletterReplyTo,
});
const app = createApp({
  repository,
  provider,
  webUrl: config.webUrl,
  apiPublicUrl: config.apiPublicUrl,
  allowedOrigins: config.allowedOrigins,
  recipientAllowlist: config.recipientAllowlist,
  eventHashSalt: config.eventHashSalt,
  confirmationTtlHours: config.confirmationTtlHours,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowSeconds: config.rateLimitWindowSeconds,
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  process.stdout.write(`${JSON.stringify({ event: "server_started", port: info.port })}\n`);
});

async function shutdown(signal: string) {
  process.stdout.write(`${JSON.stringify({ event: "server_stopping", signal })}\n`);
  server.close();
  await repository.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
