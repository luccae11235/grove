import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { PostgresObservabilityRepository } from "./postgresRepository.js";

const config = loadConfig();
const repository = new PostgresObservabilityRepository(config.databaseUrl);
const app = createApp({
  repository,
  allowedOrigins: config.allowedOrigins,
  linkSecret: config.linkSecret,
  consentVersion: config.consentVersion,
  deploymentEnvironment: config.deploymentEnvironment,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowSeconds: config.rateLimitWindowSeconds,
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  process.stdout.write(`${JSON.stringify({
    event: "server_started",
    service: "observability-api",
    environment: config.deploymentEnvironment,
    port: info.port,
  })}\n`);
});

async function shutdown(signal: string) {
  process.stdout.write(`${JSON.stringify({
    event: "server_stopping",
    service: "observability-api",
    signal,
  })}\n`);
  server.close();
  await repository.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
