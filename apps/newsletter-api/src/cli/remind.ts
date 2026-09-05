import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { confirmationReminders } from "../confirmationReminders.js";
import { ResendNewsletterProvider } from "../provider.js";

const { values } = parseArgs({ options: {
  batch: { type: "string" }, recipients: { type: "string" },
  limit: { type: "string", default: "50" }, "max-reminders": { type: "string", default: "1" },
  apply: { type: "boolean", default: false }, confirm: { type: "string" },
} });
const batch = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).parse(values.batch);
const limit = z.coerce.number().int().min(1).max(500).parse(values.limit);
const maxReminders = z.coerce.number().int().min(1).max(3).parse(values["max-reminders"]);
const config = loadConfig();
if (values.apply && (!values.recipients || values.confirm !== `REMIND:${config.deploymentEnvironment}:${batch}`)) {
  throw new Error("Apply requires a reviewed --recipients file and --confirm REMIND:<environment>:<batch>.");
}
const emails = values.recipients
  ? [...new Set(z.array(z.string().trim().toLowerCase().email()).min(1).max(500).parse(
      JSON.parse(await readFile(values.recipients, "utf8")),
    ))] : undefined;
if (values.apply) {
  const healthResponse = await fetch(`${config.apiPublicUrl}/health`);
  const versionResponse = await fetch(`${config.webUrl}/version.json`);
  if (!healthResponse.ok || !versionResponse.ok) throw new Error("Deployment verification unavailable.");
  const health = await healthResponse.json() as { confirmationMode?: string; releaseSha?: string };
  const version = await versionResponse.json() as { releaseSha?: string };
  if (health.confirmationMode !== "explicit-post" || !health.releaseSha ||
      health.releaseSha === "development" || health.releaseSha !== version.releaseSha) {
    throw new Error("Deploy and verify the explicit confirmation flow on both services before sending.");
  }
}
const sql = postgres(config.databaseUrl, { max: 1 });
const provider = new ResendNewsletterProvider({
  apiKey: config.resendApiKey, webhookSecret: config.resendWebhookSecret,
  segmentId: config.resendSegmentId, from: config.newsletterFrom,
  transactionalFrom: config.newsletterTransactionalFrom, replyTo: config.newsletterReplyTo,
});
try {
  const results = await confirmationReminders(sql, provider, {
    batch, emails, limit, maxReminders, webUrl: config.webUrl,
    allowlist: config.recipientAllowlist, apply: values.apply!,
  });
  process.stdout.write(`${JSON.stringify({ environment: config.deploymentEnvironment,
    mode: values.apply ? "apply" : "dry-run", batch, results }, null, 2)}\n`);
  if (results.some((r) => r.state === "unknown")) process.exitCode = 1;
} finally {
  await sql.end();
}
