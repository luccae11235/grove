import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { Resend } from "resend";
import { loadConfig } from "../config.js";

const requiredConfirmation = "PROVE:staging-newsletter";
const confirmationIndex = process.argv.indexOf("--confirm");
if (process.argv[confirmationIndex + 1] !== requiredConfirmation) {
  throw new Error(
    `This command sends only to Resend test addresses. Re-run with --confirm ${requiredConfirmation}.`,
  );
}

const config = loadConfig();
assertStaging(config.apiPublicUrl, config.webUrl, config.publicSignup, config.recipientAllowlist);

const sql = postgres(config.databaseUrl, { max: 2, connect_timeout: 10 });
const resend = new Resend(config.resendApiKey);
const runId = Date.now().toString(36);
const source = `staging-proof-${runId}`;
const syntheticEmails = new Set<string>();
const syntheticContacts = new Set<string>();
const results: Array<{ check: string; status: "passed" }> = [];

try {
  await proveHttpBoundaries();
  await proveDeliveryEvent("delivered", "email.delivered", "active");
  await proveDeliveryEvent("bounced", "email.bounced", "bounced");
  await proveDeliveryEvent("complained", "email.complained", "complained");
  await proveDeliveryEvent("suppressed", "email.suppressed", "suppressed");
  await proveUnsubscribe();

  process.stdout.write(`${JSON.stringify({
    ok: true,
    runId,
    apiUrl: config.apiPublicUrl,
    checks: results,
  }, null, 2)}\n`);
} finally {
  for (const email of syntheticContacts) {
    const removed = await resend.contacts.remove({ email });
    if (removed.error && removed.error.name !== "not_found") {
      process.stderr.write(`Warning: could not remove synthetic Resend contact ${email}.\n`);
    }
  }
  if (syntheticEmails.size > 0) {
    await sql`
      DELETE FROM newsletter_subscriber_events
      WHERE subscriber_id IN (
        SELECT subscriber_id FROM newsletter_subscribers WHERE source = ${source}
      )
    `;
    await sql`DELETE FROM newsletter_subscribers WHERE source = ${source}`;
  }
  await sql.end();
}

async function proveHttpBoundaries() {
  const health = await fetch(`${config.apiPublicUrl}/health`, {
    signal: AbortSignal.timeout(15_000),
  });
  assert(health.status === 200, `health returned HTTP ${health.status}`);
  assert((await health.json() as { status?: string }).status === "ok", "health did not return ok");

  const invalidToken = await fetch(
    `${config.apiPublicUrl}/v1/subscriptions/confirm?token=altered-${runId}`,
    { redirect: "manual", signal: AbortSignal.timeout(15_000) },
  );
  assert(invalidToken.status === 303, `invalid token returned HTTP ${invalidToken.status}`);
  assert(
    invalidToken.headers.get("location") === `${config.webUrl}/newsletter/confirmed?status=invalid`,
    "invalid token did not return the safe redirect",
  );

  const unsigned = await fetch(`${config.apiPublicUrl}/v1/webhooks/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15_000),
  });
  assert(unsigned.status === 400, `unsigned webhook returned HTTP ${unsigned.status}`);
  results.push({ check: "health, invalid token, and unsigned webhook boundaries", status: "passed" });
}

async function proveDeliveryEvent(
  localPart: "delivered" | "bounced" | "complained" | "suppressed",
  expectedEvent: string,
  expectedSubscriberStatus: "active" | "bounced" | "complained" | "suppressed",
) {
  const email = localPart === "suppressed"
    ? "suppressed@resend.dev"
    : `${localPart}+grove-${runId}@resend.dev`;
  await insertSyntheticSubscriber(email);

  const response = await resend.emails.send({
    from: config.newsletterFrom,
    to: email,
    subject: `Grove staging proof ${runId}`,
    html: `<p>Automated Grove staging proof ${runId}.</p>`,
    text: `Automated Grove staging proof ${runId}.`,
    tags: [{ name: "proof_run", value: runId }],
  });
  assertResend(response, `send ${localPart} proof email`);
  const providerEmailId = response.data.id;

  await poll(async () => {
    const events = await sql<{ event_type: string }[]>`
      SELECT event_type FROM newsletter_events
      WHERE provider_email_id = ${providerEmailId} AND event_type = ${expectedEvent}
    `;
    const subscribers = await sql<{ status: string }[]>`
      SELECT status FROM newsletter_subscribers WHERE email = ${email}
    `;
    return events.length === 1 && subscribers[0]?.status === expectedSubscriberStatus;
  }, `${expectedEvent} webhook and ${expectedSubscriberStatus} subscriber state`);

  results.push({ check: `${expectedEvent} signed webhook updates subscriber state`, status: "passed" });
}

async function proveUnsubscribe() {
  const email = `delivered+grove-unsubscribe-${runId}@resend.dev`;
  await insertSyntheticSubscriber(email);
  const created = await resend.contacts.create({
    email,
    unsubscribed: false,
    segments: [{ id: config.resendSegmentId }],
  });
  assertResend(created, "create synthetic unsubscribe contact");
  syntheticContacts.add(email);

  const updated = await resend.contacts.update({ email, unsubscribed: true });
  assertResend(updated, "unsubscribe synthetic contact");
  await poll(async () => {
    const subscribers = await sql<{ status: string }[]>`
      SELECT status FROM newsletter_subscribers WHERE email = ${email}
    `;
    return subscribers[0]?.status === "unsubscribed";
  }, "contact.updated webhook and unsubscribed subscriber state");

  results.push({ check: "provider unsubscribe webhook updates subscriber state", status: "passed" });
}

async function insertSyntheticSubscriber(email: string) {
  const existing = await sql<{ email: string }[]>`
    SELECT email FROM newsletter_subscribers WHERE email = ${email}
  `;
  assert(existing.length === 0, `synthetic address already exists: ${email}`);
  syntheticEmails.add(email);
  await sql`
    INSERT INTO newsletter_subscribers (
      subscriber_id, email, status, locale, source,
      consent_requested_at, confirmed_at, created_at, updated_at
    ) VALUES (
      ${randomUUID()}, ${email}, 'active', 'en', ${source},
      now(), now(), now(), now()
    )
  `;
}

async function poll(operation: () => Promise<boolean>, description: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await operation()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function assertStaging(
  apiUrl: string,
  webUrl: string,
  publicSignup: boolean,
  allowlist?: string[],
) {
  const environmentName = process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase();
  const stagingHostnames = [new URL(apiUrl).hostname, new URL(webUrl).hostname]
    .every((hostname) => hostname.includes("staging"));
  if (environmentName !== "staging" || !stagingHostnames) {
    throw new Error("Refusing to run outside the Railway staging environment and staging URLs.");
  }
  if (publicSignup || !allowlist) {
    throw new Error("Refusing to run unless staging is fail-closed with a recipient allowlist.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertResend<T>(
  response: { data: T | null; error: { name: string } | null },
  operation: string,
): asserts response is { data: T; error: null } {
  if (!response.data || response.error) {
    throw new Error(`Unable to ${operation}: ${response.error?.name ?? "empty_response"}`);
  }
}
