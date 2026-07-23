import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "../config.js";
import { assertBroadcastPolicy, assertEmailArtifacts } from "../broadcastPolicy.js";
import { PostgresNewsletterRepository } from "../postgresRepository.js";
import { ResendNewsletterProvider } from "../provider.js";

interface ManifestIssue {
  id: string;
  issueNumber: number;
  subject: string;
  preheader: string;
  status: "draft" | "ready" | "published";
  htmlPath: string;
  textPath: string;
}

interface NewsletterManifest {
  postalAddressReady: boolean;
  issues: ManifestIssue[];
}

const args = parseArguments(process.argv.slice(2));
if (!args.issueId) {
  throw new Error("Usage: pnpm newsletter:broadcast --issue <issue-id> [--send --confirm SEND:<issue-id>] [--schedule <ISO date>]");
}
const config = loadConfig();
const manifestPath = resolve(args.manifestPath ?? "apps/web/dist/newsletter/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as NewsletterManifest;
const issue = manifest.issues.find((candidate) => candidate.id === args.issueId);
if (!issue) throw new Error(`Issue "${args.issueId}" is not present in ${manifestPath}.`);
assertBroadcastPolicy({
  issueId: issue.id,
  status: issue.status,
  postalAddressReady: manifest.postalAddressReady,
  send: args.send,
  scheduledAt: args.scheduledAt,
  confirmation: args.confirm,
});

const distributionRoot = resolve(manifestPath, "..");
const html = await readArtifact(distributionRoot, issue.htmlPath, true);
const text = await readArtifact(distributionRoot, issue.textPath, false);
assertEmailArtifacts(html, text);

const repository = new PostgresNewsletterRepository(config.databaseUrl);
try {
  const existing = await repository.getBroadcast(issue.id);
  if (existing && existing.status !== "draft") {
    throw new Error(
      `Issue ${issue.id} already maps to provider broadcast ${existing.providerBroadcastId} (${existing.status}).`,
    );
  }
  const provider = new ResendNewsletterProvider({
    apiKey: config.resendApiKey,
    webhookSecret: config.resendWebhookSecret,
    segmentId: config.resendSegmentId,
    topicId: config.resendTopicId,
    from: config.newsletterFrom,
    replyTo: config.newsletterReplyTo,
  });
  if (config.recipientAllowlist) {
    await provider.assertSegmentRecipientsAllowed(config.recipientAllowlist);
  }
  const send = args.send || Boolean(args.scheduledAt);
  const message = {
    name: `Grove ${String(issue.issueNumber).padStart(3, "0")} · ${issue.id}`,
    subject: issue.subject,
    previewText: issue.preheader,
    html,
    text,
    send,
    scheduledAt: args.scheduledAt,
    topicId: config.resendTopicId,
  };
  let providerBroadcastId: string;
  if (existing) {
    providerBroadcastId = existing.providerBroadcastId;
    await provider.updateBroadcast(providerBroadcastId, message);
    if (send) await provider.sendBroadcast(providerBroadcastId, args.scheduledAt);
  } else {
    providerBroadcastId = await provider.createBroadcast(message);
  }
  await repository.recordBroadcast({
    issueId: issue.id,
    providerBroadcastId,
    status: args.scheduledAt ? "scheduled" : send ? "sent" : "draft",
    subject: issue.subject,
    scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : undefined,
  });
  process.stdout.write(`${JSON.stringify({
    issueId: issue.id,
    providerBroadcastId,
    status: args.scheduledAt ? "scheduled" : send ? "sent" : "draft",
  }, null, 2)}\n`);
} finally {
  await repository.close();
}

function parseArguments(values: string[]) {
  const result: {
    issueId?: string;
    manifestPath?: string;
    send: boolean;
    confirm?: string;
    scheduledAt?: string;
  } = { send: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--send") result.send = true;
    else if (value === "--issue") result.issueId = values[++index];
    else if (value === "--manifest") result.manifestPath = values[++index];
    else if (value === "--confirm") result.confirm = values[++index];
    else if (value === "--schedule") result.scheduledAt = values[++index];
  }
  if (result.scheduledAt && Number.isNaN(new Date(result.scheduledAt).getTime())) {
    throw new Error("--schedule must be a valid ISO date.");
  }
  if (result.scheduledAt && !/(?:Z|[+-]\d{2}:\d{2})$/.test(result.scheduledAt)) {
    throw new Error("--schedule must include an explicit timezone, such as Z or -03:00.");
  }
  if (result.scheduledAt && new Date(result.scheduledAt).getTime() <= Date.now()) {
    throw new Error("--schedule must be in the future.");
  }
  return result;
}

async function readArtifact(manifestDirectory: string, publicPath: string, directoryIndex: boolean) {
  const relative = publicPath.replace(/^\//, "");
  const path = directoryIndex && relative.endsWith("/")
    ? resolve(manifestDirectory, "..", relative, "index.html")
    : resolve(manifestDirectory, "..", relative);
  return readFile(path, "utf8");
}
