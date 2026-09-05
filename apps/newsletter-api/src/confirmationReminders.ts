import { setTimeout as delay } from "node:timers/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import type { NewsletterProvider } from "./provider.js";

export interface ReminderOptions {
  batch: string;
  emails?: string[];
  limit: number;
  maxReminders: number;
  webUrl: string;
  allowlist?: string[];
  apply: boolean;
}

// A reservation is durable before contacting the provider. Ambiguous failures are
// never retried automatically, even with a different batch id.
export async function confirmationReminders(sql: Sql, provider: NewsletterProvider, options: ReminderOptions) {
  const candidates = await sql<{ subscriber_id: string; email: string; locale: "en" | "pt-BR" }[]>`
    SELECT s.subscriber_id, s.email, s.locale FROM newsletter_subscribers s
    WHERE s.status = 'pending' AND s.created_at > now() - interval '30 days'
      AND (${options.emails ?? null}::text[] IS NULL OR s.email = ANY(${options.emails ?? null}::text[]))
      AND (${options.allowlist ?? null}::text[] IS NULL OR s.email = ANY(${options.allowlist ?? null}::text[]))
      AND EXISTS (SELECT 1 FROM newsletter_subscription_actions a
        WHERE a.subscriber_id = s.subscriber_id AND a.action_type = 'confirm')
      AND NOT EXISTS (SELECT 1 FROM newsletter_subscription_actions a
        WHERE a.subscriber_id = s.subscriber_id AND a.action_type = 'confirm'
          AND (a.used_at IS NOT NULL OR a.expires_at > now() OR a.requested_at > now() - interval '7 days'))
      AND NOT EXISTS (SELECT 1 FROM newsletter_confirmation_reminders r
        WHERE r.subscriber_id = s.subscriber_id AND (r.batch_id = ${options.batch} OR r.state != 'sent'))
      AND (SELECT count(*) FROM newsletter_confirmation_reminders r
        WHERE r.subscriber_id = s.subscriber_id) < ${options.maxReminders}
    ORDER BY s.created_at, s.subscriber_id LIMIT ${options.limit}
  `;
  if (!options.apply) return candidates.map((c) => ({ ...c, state: "eligible" }));
  const results = [];
  for (const candidate of candidates) {
    if (results.length) await delay(600);
    const token = randomBytes(32).toString("base64url");
    const actionId = randomUUID();
    const hash = createHash("sha256").update(token).digest("hex");
    const reserved = await sql.begin(async (tx) => {
      // Same email lock as public signup; recheck all eligibility under the row lock.
      await tx`SELECT pg_advisory_xact_lock(hashtext(${candidate.email}))`;
      const locked = await tx`SELECT subscriber_id FROM newsletter_subscribers
        WHERE subscriber_id = ${candidate.subscriber_id} AND status = 'pending'
          AND created_at > now() - interval '30 days' FOR UPDATE`;
      if (!locked.length) return false;
      const actions = await tx`SELECT action_id FROM newsletter_subscription_actions
        WHERE subscriber_id = ${candidate.subscriber_id} AND action_type = 'confirm'
          AND (used_at IS NOT NULL OR expires_at > now() OR requested_at > now() - interval '7 days')`;
      const reminders = await tx`SELECT batch_id, state FROM newsletter_confirmation_reminders
        WHERE subscriber_id = ${candidate.subscriber_id}`;
      if (actions.length || reminders.length >= options.maxReminders ||
        reminders.some((r) => r.batch_id === options.batch || r.state !== 'sent')) return false;
      await tx`INSERT INTO newsletter_subscription_actions
        (action_id, subscriber_id, action_type, token_hash, expires_at, requested_at)
        VALUES (${actionId}, ${candidate.subscriber_id}, 'confirm', ${hash}, now() + interval '48 hours', now())`;
      await tx`INSERT INTO newsletter_confirmation_reminders (batch_id, subscriber_id, action_id, state)
        VALUES (${options.batch}, ${candidate.subscriber_id}, ${actionId}, 'reserved')`;
      return true;
    });
    if (!reserved) { results.push({ email: candidate.email, state: "skipped" }); continue; }
    try {
      const providerId = await provider.sendConfirmation({
        email: candidate.email, locale: candidate.locale, reminder: true,
        idempotencyKey: `confirmation-reminder/${actionId}`,
        confirmationUrl: `${options.webUrl}${candidate.locale === "pt-BR" ? "/pt-br" : ""}/newsletter/confirm?token=${token}`,
      });
      await sql`UPDATE newsletter_confirmation_reminders SET state = 'sent', provider_email_id = ${providerId ?? null}
        WHERE batch_id = ${options.batch} AND subscriber_id = ${candidate.subscriber_id}`;
      results.push({ email: candidate.email, state: "sent", providerEmailId: providerId });
    } catch {
      await sql`UPDATE newsletter_confirmation_reminders SET state = 'unknown'
        WHERE batch_id = ${options.batch} AND subscriber_id = ${candidate.subscriber_id}`;
      results.push({ email: candidate.email, state: "unknown" });
      // Stop the batch on provider/database uncertainty; reconcile before resuming.
      break;
    }
  }
  return results;
}
