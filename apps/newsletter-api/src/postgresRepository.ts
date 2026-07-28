import postgres, { type Sql } from "postgres";
import type {
  BroadcastRecord,
  IssueMetrics,
  SubscriptionActionLookup,
  SubscriptionActionRequest,
  SubscriptionRequestOutcome,
  SubscriberStatus,
  SubscriptionRequest,
  WebhookRecord,
  WebhookSubscriberUpdate,
} from "./domain.js";
import { emptyIssueMetrics, type NewsletterRepository } from "./repository.js";

type ActionSubscriberRow = {
  action_id: string;
  subscriber_id: string;
  email: string;
  locale: "en" | "pt-BR";
  expires_at: Date;
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

  async requestSubscription(input: SubscriptionRequest): Promise<SubscriptionRequestOutcome> {
    return this.sql.begin(async (sql) => {
      await sql`SELECT pg_advisory_xact_lock(hashtext(${input.email}))`;
      const existing = await sql<{
        subscriber_id: string;
        status: SubscriberStatus;
      }[]>`
        SELECT subscriber_id, status
        FROM newsletter_subscribers
        WHERE email = ${input.email}
        FOR UPDATE
      `;
      if (existing[0]?.status === "active") {
        return "send-management";
      }
      if (
        existing[0] &&
        ["bounced", "complained", "suppressed"].includes(existing[0].status)
      ) {
        return "blocked";
      }
      if (existing[0]?.status === "pending") {
        const recent = await sql<{ action_id: string }[]>`
          SELECT action_id
          FROM newsletter_subscription_actions
          WHERE subscriber_id = ${existing[0].subscriber_id}
            AND action_type = 'confirm'
            AND used_at IS NULL
            AND requested_at > ${input.cooldownBefore}
          ORDER BY requested_at DESC
          LIMIT 1
        `;
        if (recent.length > 0) return "cooldown";
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
          ${input.tokenHash}, ${input.expiresAt},
          ${input.requestedAt}, ${input.requestedAt}, ${input.requestedAt}
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
          confirmed_at = CASE
            WHEN newsletter_subscribers.status = 'unsubscribed' THEN NULL
            ELSE newsletter_subscribers.confirmed_at
          END,
          updated_at = EXCLUDED.updated_at
      `;
      await sql`
        INSERT INTO newsletter_subscription_actions (
          action_id, subscriber_id, action_type, token_hash,
          expires_at, requested_at
        ) VALUES (
          ${input.actionId}, ${existing[0]?.subscriber_id ?? input.subscriberId},
          'confirm', ${input.tokenHash}, ${input.expiresAt}, ${input.requestedAt}
        )
      `;
      const subscriberId = existing[0]?.subscriber_id ?? input.subscriberId;
      const previousStatus = existing[0]?.status ?? null;
      await sql`
        INSERT INTO newsletter_subscriber_events (
          subscriber_id, event_type, previous_status, new_status,
          occurred_at, source, source_event_id
        ) VALUES (
          ${subscriberId},
          ${previousStatus && previousStatus !== "pending"
            ? "reactivation_requested"
            : "subscription_requested"},
          ${previousStatus}, 'pending', ${input.requestedAt}, 'signup',
          ${`request:${input.actionId}`}
        )
        ON CONFLICT (source_event_id) DO NOTHING
      `;
      return "send-confirmation";
    });
  }

  async requestUnsubscribe(input: SubscriptionActionRequest) {
    return this.sql.begin(async (sql) => {
      await sql`SELECT pg_advisory_xact_lock(hashtext(${input.email}))`;
      const subscribers = await sql<{ subscriber_id: string; locale: "en" | "pt-BR" }[]>`
        SELECT subscriber_id, locale
        FROM newsletter_subscribers
        WHERE email = ${input.email} AND status = 'active'
        FOR UPDATE
      `;
      const subscriber = subscribers[0];
      if (!subscriber) return null;
      const recent = await sql<{ action_id: string }[]>`
        SELECT action_id
        FROM newsletter_subscription_actions
        WHERE subscriber_id = ${subscriber.subscriber_id}
          AND action_type = 'unsubscribe'
          AND used_at IS NULL
          AND requested_at > ${input.cooldownBefore}
        ORDER BY requested_at DESC
        LIMIT 1
      `;
      if (recent.length > 0) return null;
      await sql`
        INSERT INTO newsletter_subscription_actions (
          action_id, subscriber_id, action_type, token_hash,
          expires_at, requested_at
        ) VALUES (
          ${input.actionId}, ${subscriber.subscriber_id}, 'unsubscribe',
          ${input.tokenHash}, ${input.expiresAt}, ${input.requestedAt}
        )
      `;
      return subscriber.locale;
    });
  }

  async discardUnsentAction(tokenHash: string) {
    await this.sql.begin(async (sql) => {
      const removed = await sql<{
        subscriber_id: string;
        action_type: "confirm" | "unsubscribe";
      }[]>`
        DELETE FROM newsletter_subscription_actions
        WHERE token_hash = ${tokenHash} AND used_at IS NULL
        RETURNING subscriber_id, action_type
      `;
      if (removed[0]?.action_type !== "confirm") return;
      await sql`
        UPDATE newsletter_subscribers
        SET confirmation_token_hash = replacement.token_hash,
            confirmation_expires_at = replacement.expires_at
        FROM LATERAL (
          SELECT token_hash, expires_at
          FROM newsletter_subscription_actions
          WHERE subscriber_id = ${removed[0].subscriber_id}
            AND action_type = 'confirm'
            AND used_at IS NULL
          ORDER BY requested_at DESC
          LIMIT 1
        ) replacement
        WHERE newsletter_subscribers.subscriber_id = ${removed[0].subscriber_id}
      `;
      const replacement = await sql<{ token_hash: string }[]>`
        SELECT token_hash
        FROM newsletter_subscription_actions
        WHERE subscriber_id = ${removed[0].subscriber_id}
          AND action_type = 'confirm'
          AND used_at IS NULL
        LIMIT 1
      `;
      if (replacement.length === 0) {
        await sql`
          UPDATE newsletter_subscribers
          SET confirmation_token_hash = NULL,
              confirmation_expires_at = NULL
          WHERE subscriber_id = ${removed[0].subscriber_id}
        `;
      }
    });
  }

  async findConfirmationByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SubscriptionActionLookup | null> {
    return this.findActionByTokenHash("confirm", "pending", tokenHash, now);
  }

  async findUnsubscribeByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SubscriptionActionLookup | null> {
    return this.findActionByTokenHash("unsubscribe", "active", tokenHash, now);
  }

  private async findActionByTokenHash(
    actionType: "confirm" | "unsubscribe",
    status: "pending" | "active",
    tokenHash: string,
    now: Date,
  ): Promise<SubscriptionActionLookup | null> {
    const rows = await this.sql<ActionSubscriberRow[]>`
      SELECT actions.action_id, subscribers.subscriber_id, subscribers.email,
             subscribers.locale, actions.expires_at
      FROM newsletter_subscription_actions actions
      JOIN newsletter_subscribers subscribers
        ON subscribers.subscriber_id = actions.subscriber_id
      WHERE actions.token_hash = ${tokenHash}
        AND actions.action_type = ${actionType}
        AND actions.used_at IS NULL
        AND subscribers.status = ${status}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      subscriber: {
        actionId: row.action_id,
        subscriberId: row.subscriber_id,
        email: row.email,
        locale: row.locale,
        expiresAt: row.expires_at,
      },
      expired: row.expires_at.getTime() <= now.getTime(),
    };
  }

  async activateSubscriber(
    subscriberId: string,
    actionId: string,
    providerContactId: string,
    now: Date,
  ) {
    return this.sql.begin(async (sql) => {
      const rows = await sql<{ subscriber_id: string }[]>`
        UPDATE newsletter_subscribers
        SET status = 'active',
            confirmation_token_hash = NULL,
            confirmation_expires_at = NULL,
            confirmed_at = ${now},
            provider_contact_id = ${providerContactId},
            updated_at = ${now}
        WHERE subscriber_id = ${subscriberId}
          AND status = 'pending'
          AND EXISTS (
            SELECT 1 FROM newsletter_subscription_actions
            WHERE action_id = ${actionId}
              AND subscriber_id = ${subscriberId}
              AND action_type = 'confirm'
              AND used_at IS NULL
              AND expires_at > ${now}
          )
        RETURNING subscriber_id
      `;
      if (rows.length !== 1) return false;
      await sql`
        UPDATE newsletter_subscription_actions
        SET used_at = ${now}
        WHERE action_id = ${actionId}
      `;
      await sql`
        INSERT INTO newsletter_subscriber_events (
          subscriber_id, event_type, previous_status, new_status,
          occurred_at, source, source_event_id
        ) VALUES (
          ${subscriberId}, 'confirmed', 'pending', 'active',
          ${now}, 'confirmation', ${`confirm:${actionId}`}
        )
        ON CONFLICT (source_event_id) DO NOTHING
      `;
      return true;
    });
  }

  async unsubscribeSubscriber(subscriberId: string, actionId: string, now: Date) {
    return this.sql.begin(async (sql) => {
      const rows = await sql<{ subscriber_id: string }[]>`
        UPDATE newsletter_subscribers
        SET status = 'unsubscribed', updated_at = ${now}
        WHERE subscriber_id = ${subscriberId}
          AND status = 'active'
          AND EXISTS (
            SELECT 1 FROM newsletter_subscription_actions
            WHERE action_id = ${actionId}
              AND subscriber_id = ${subscriberId}
              AND action_type = 'unsubscribe'
              AND used_at IS NULL
              AND expires_at > ${now}
          )
        RETURNING subscriber_id
      `;
      if (rows.length !== 1) return false;
      await sql`
        UPDATE newsletter_subscription_actions
        SET used_at = ${now}
        WHERE action_id = ${actionId}
      `;
      await sql`
        INSERT INTO newsletter_subscriber_events (
          subscriber_id, event_type, previous_status, new_status,
          occurred_at, source, source_event_id
        ) VALUES (
          ${subscriberId}, 'unsubscribed', 'active', 'unsubscribed',
          ${now}, 'confirmation', ${`unsubscribe:${actionId}`}
        )
        ON CONFLICT (source_event_id) DO NOTHING
      `;
      return true;
    });
  }

  async recordWebhook(event: WebhookRecord, subscriberUpdate?: WebhookSubscriberUpdate) {
    return this.sql.begin(async (sql) => {
      const rows = await sql<{ svix_id: string }[]>`
        INSERT INTO newsletter_events (
          svix_id, event_type, event_created_at, provider_email_id,
          provider_broadcast_id, recipient_hash, clicked_url, tags
        ) VALUES (
          ${event.svixId}, ${event.eventType}, ${event.eventCreatedAt},
          ${event.providerEmailId ?? null}, ${event.providerBroadcastId ?? null},
          ${event.recipientHash ?? null}, ${event.clickedUrl ?? null},
          ${sql.json(event.tags)}
        )
        ON CONFLICT (svix_id) DO NOTHING
        RETURNING svix_id
      `;
      if (rows.length !== 1 || !subscriberUpdate) return rows.length === 1;
      const subscribers = await sql<{
        subscriber_id: string;
        status: SubscriberStatus;
      }[]>`
        SELECT subscriber_id, status
        FROM newsletter_subscribers
        WHERE email = ${subscriberUpdate.email.toLowerCase()}
        FOR UPDATE
      `;
      const subscriber = subscribers[0];
      if (!subscriber) return true;
      await sql`
        UPDATE newsletter_subscribers
        SET status = ${subscriberUpdate.status}, updated_at = ${event.eventCreatedAt}
        WHERE subscriber_id = ${subscriber.subscriber_id}
      `;
      await sql`
        INSERT INTO newsletter_subscriber_events (
          subscriber_id, event_type, previous_status, new_status,
          occurred_at, source, source_event_id
        ) VALUES (
          ${subscriber.subscriber_id}, ${subscriberUpdate.status},
          ${subscriber.status}, ${subscriberUpdate.status},
          ${event.eventCreatedAt}, 'resend_webhook', ${`resend:${event.svixId}`}
        )
        ON CONFLICT (source_event_id) DO NOTHING
      `;
      return true;
    });
  }

  async markSubscriberStatusByEmail(email: string, status: SubscriberStatus, now: Date) {
    await this.sql.begin(async (sql) => {
      const rows = await sql<{ subscriber_id: string; status: SubscriberStatus }[]>`
        SELECT subscriber_id, status
        FROM newsletter_subscribers
        WHERE email = ${email.toLowerCase()}
        FOR UPDATE
      `;
      const subscriber = rows[0];
      if (!subscriber) return;
      await sql`
        UPDATE newsletter_subscribers
        SET status = ${status}, updated_at = ${now}
        WHERE subscriber_id = ${subscriber.subscriber_id}
      `;
      await sql`
        INSERT INTO newsletter_subscriber_events (
          subscriber_id, event_type, previous_status, new_status,
          occurred_at, source, source_event_id
        ) VALUES (
          ${subscriber.subscriber_id}, ${status}, ${subscriber.status}, ${status},
          ${now}, 'resend_webhook',
          ${`manual:${subscriber.subscriber_id}:${status}:${now.toISOString()}`}
        )
        ON CONFLICT (source_event_id) DO NOTHING
      `;
    });
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
      await sql`
        DELETE FROM newsletter_subscription_actions
        WHERE expires_at < ${pendingBefore}
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
