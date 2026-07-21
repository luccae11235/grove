import postgres, { type Sql } from "postgres";
import type {
  BroadcastRecord,
  IssueMetrics,
  PendingSubscriber,
  SubscriberStatus,
  SubscriptionRequest,
  WebhookRecord,
} from "./domain.js";
import { emptyIssueMetrics, type NewsletterRepository } from "./repository.js";

type SubscriberRow = {
  subscriber_id: string;
  email: string;
  locale: "en" | "pt-BR";
  source: string;
  confirmation_expires_at: Date;
};

export class PostgresNewsletterRepository implements NewsletterRepository {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {
      max: 8,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  async requestSubscription(input: SubscriptionRequest) {
    return this.sql.begin(async (sql) => {
      await sql`SELECT pg_advisory_xact_lock(hashtext(${input.email}))`;
      const existing = await sql<{
        subscriber_id: string;
        status: SubscriberStatus;
        consent_requested_at: Date;
      }[]>`
        SELECT subscriber_id, status, consent_requested_at
        FROM newsletter_subscribers
        WHERE email = ${input.email}
        FOR UPDATE
      `;
      if (existing[0]?.status === "active") {
        return { shouldSendConfirmation: false };
      }
      if (
        existing[0]?.status === "pending" &&
        input.requestedAt.getTime() - existing[0].consent_requested_at.getTime() < 10 * 60 * 1000
      ) {
        return { shouldSendConfirmation: false };
      }

      await sql`
        INSERT INTO newsletter_subscribers (
          subscriber_id, email, status, locale, source,
          utm_source, utm_medium, utm_campaign,
          confirmation_token_hash, confirmation_expires_at,
          consent_requested_at, created_at, updated_at
        ) VALUES (
          ${existing[0]?.subscriber_id ?? input.subscriberId}, ${input.email}, 'pending',
          ${input.locale}, ${input.source}, ${input.utmSource ?? null},
          ${input.utmMedium ?? null}, ${input.utmCampaign ?? null},
          ${input.tokenHash}, ${input.expiresAt}, ${input.requestedAt},
          ${input.requestedAt}, ${input.requestedAt}
        )
        ON CONFLICT (email) DO UPDATE SET
          status = 'pending',
          locale = EXCLUDED.locale,
          source = EXCLUDED.source,
          utm_source = EXCLUDED.utm_source,
          utm_medium = EXCLUDED.utm_medium,
          utm_campaign = EXCLUDED.utm_campaign,
          confirmation_token_hash = EXCLUDED.confirmation_token_hash,
          confirmation_expires_at = EXCLUDED.confirmation_expires_at,
          consent_requested_at = EXCLUDED.consent_requested_at,
          updated_at = EXCLUDED.updated_at
      `;
      return { shouldSendConfirmation: true };
    });
  }

  async findPendingByTokenHash(tokenHash: string, now: Date): Promise<PendingSubscriber | null> {
    const rows = await this.sql<SubscriberRow[]>`
      SELECT subscriber_id, email, locale, source, confirmation_expires_at
      FROM newsletter_subscribers
      WHERE confirmation_token_hash = ${tokenHash}
        AND status = 'pending'
        AND confirmation_expires_at > ${now}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      subscriberId: row.subscriber_id,
      email: row.email,
      locale: row.locale,
      source: row.source,
      expiresAt: row.confirmation_expires_at,
    };
  }

  async activateSubscriber(subscriberId: string, providerContactId: string, now: Date) {
    const rows = await this.sql<{ subscriber_id: string }[]>`
      UPDATE newsletter_subscribers
      SET status = 'active',
          confirmation_token_hash = NULL,
          confirmation_expires_at = NULL,
          confirmed_at = COALESCE(confirmed_at, ${now}),
          provider_contact_id = ${providerContactId},
          updated_at = ${now}
      WHERE subscriber_id = ${subscriberId} AND status = 'pending'
      RETURNING subscriber_id
    `;
    return rows.length === 1;
  }

  async recordWebhook(event: WebhookRecord) {
    const rows = await this.sql<{ svix_id: string }[]>`
      INSERT INTO newsletter_events (
        svix_id, event_type, event_created_at, provider_email_id,
        provider_broadcast_id, recipient_hash, clicked_url, tags
      ) VALUES (
        ${event.svixId}, ${event.eventType}, ${event.eventCreatedAt},
        ${event.providerEmailId ?? null}, ${event.providerBroadcastId ?? null},
        ${event.recipientHash ?? null}, ${event.clickedUrl ?? null},
        ${this.sql.json(event.tags)}
      )
      ON CONFLICT (svix_id) DO NOTHING
      RETURNING svix_id
    `;
    return rows.length === 1;
  }

  async markSubscriberStatusByEmail(email: string, status: SubscriberStatus, now: Date) {
    await this.sql`
      UPDATE newsletter_subscribers
      SET status = ${status}, updated_at = ${now}
      WHERE email = ${email.toLowerCase()}
    `;
  }

  async recordBroadcast(record: BroadcastRecord) {
    await this.sql`
      INSERT INTO newsletter_broadcasts (
        issue_id, provider_broadcast_id, status, subject, scheduled_at
      ) VALUES (
        ${record.issueId}, ${record.providerBroadcastId}, ${record.status},
        ${record.subject}, ${record.scheduledAt ?? null}
      )
      ON CONFLICT (issue_id) DO UPDATE SET
        provider_broadcast_id = EXCLUDED.provider_broadcast_id,
        status = EXCLUDED.status,
        subject = EXCLUDED.subject,
        scheduled_at = EXCLUDED.scheduled_at,
        updated_at = now()
    `;
  }

  async getBroadcast(issueId: string): Promise<BroadcastRecord | null> {
    const rows = await this.sql<{
      issue_id: string;
      provider_broadcast_id: string;
      status: "draft" | "scheduled" | "sent";
      subject: string;
      scheduled_at: Date | null;
    }[]>`
      SELECT issue_id, provider_broadcast_id, status, subject, scheduled_at
      FROM newsletter_broadcasts
      WHERE issue_id = ${issueId}
    `;
    const row = rows[0];
    return row ? {
      issueId: row.issue_id,
      providerBroadcastId: row.provider_broadcast_id,
      status: row.status,
      subject: row.subject,
      scheduledAt: row.scheduled_at ?? undefined,
    } : null;
  }

  async markBroadcastSent(providerBroadcastId: string) {
    await this.sql`
      UPDATE newsletter_broadcasts
      SET status = 'sent', updated_at = now()
      WHERE provider_broadcast_id = ${providerBroadcastId}
        AND status = 'scheduled'
    `;
  }

  async getIssueMetrics(issueId: string): Promise<IssueMetrics> {
    const broadcasts = await this.sql<{
      provider_broadcast_id: string;
      status: string;
    }[]>`
      SELECT provider_broadcast_id, status
      FROM newsletter_broadcasts
      WHERE issue_id = ${issueId}
    `;
    const broadcast = broadcasts[0];
    if (!broadcast) return emptyIssueMetrics(issueId);

    const counts = await this.sql<Record<string, string>[]>`
      SELECT
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.sent') AS sent,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.delivered') AS delivered,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.opened') AS unique_opened,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.clicked') AS unique_clicked,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.bounced') AS bounced,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.complained') AS complained,
        count(DISTINCT recipient_hash) FILTER (WHERE event_type = 'email.suppressed') AS suppressed
      FROM newsletter_events
      WHERE provider_broadcast_id = ${broadcast.provider_broadcast_id}
    `;
    const links = await this.sql<{ clicked_url: string; unique_clicks: string }[]>`
      SELECT clicked_url, count(DISTINCT recipient_hash) AS unique_clicks
      FROM newsletter_events
      WHERE provider_broadcast_id = ${broadcast.provider_broadcast_id}
        AND event_type = 'email.clicked'
        AND clicked_url IS NOT NULL
      GROUP BY clicked_url
      ORDER BY unique_clicks DESC, clicked_url ASC
      LIMIT 20
    `;
    const count = (key: string) => Number(counts[0]?.[key] ?? 0);
    const metrics: IssueMetrics = {
      issueId,
      providerBroadcastId: broadcast.provider_broadcast_id,
      status: broadcast.status,
      sent: count("sent"),
      delivered: count("delivered"),
      uniqueOpened: count("unique_opened"),
      uniqueClicked: count("unique_clicked"),
      bounced: count("bounced"),
      complained: count("complained"),
      suppressed: count("suppressed"),
      deliveryRate: null,
      uniqueOpenRate: null,
      uniqueClickRate: null,
      topLinks: links.map((link) => ({
        url: link.clicked_url,
        uniqueClicks: Number(link.unique_clicks),
      })),
    };
    metrics.deliveryRate = rate(metrics.delivered, metrics.sent);
    metrics.uniqueOpenRate = rate(metrics.uniqueOpened, metrics.delivered);
    metrics.uniqueClickRate = rate(metrics.uniqueClicked, metrics.delivered);
    return metrics;
  }

  async inspectRetention(pendingBefore: Date, eventsBefore: Date) {
    const rows = await this.sql<{ pending_subscribers: string; events: string }[]>`
      SELECT
        (SELECT count(*) FROM newsletter_subscribers
          WHERE status = 'pending' AND consent_requested_at < ${pendingBefore}) AS pending_subscribers,
        (SELECT count(*) FROM newsletter_events
          WHERE event_created_at < ${eventsBefore}) AS events
    `;
    return {
      pendingSubscribers: Number(rows[0]?.pending_subscribers ?? 0),
      events: Number(rows[0]?.events ?? 0),
    };
  }

  async applyRetention(pendingBefore: Date, eventsBefore: Date) {
    return this.sql.begin(async (sql) => {
      const pending = await sql<{ subscriber_id: string }[]>`
        DELETE FROM newsletter_subscribers
        WHERE status = 'pending' AND consent_requested_at < ${pendingBefore}
        RETURNING subscriber_id
      `;
      const events = await sql<{ svix_id: string }[]>`
        DELETE FROM newsletter_events
        WHERE event_created_at < ${eventsBefore}
        RETURNING svix_id
      `;
      return { pendingSubscribers: pending.length, events: events.length };
    });
  }

  async health() {
    await this.sql`SELECT 1`;
  }

  async close() {
    await this.sql.end({ timeout: 5 });
  }
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
