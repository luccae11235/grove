import postgres, { type Sql } from "postgres";
import type {
  AnalyticsEventInput,
  ArticleFeedbackInput,
  EngagementInput,
  IdentityLink,
  SessionInput,
} from "./domain.js";
import type { ObservabilityRepository } from "./repository.js";

export class PostgresObservabilityRepository implements ObservabilityRepository {
  readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {
      max: 8,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  async createFeedback(input: ArticleFeedbackInput) {
    const inserted = await this.sql<{ feedback_id: string }[]>`
      INSERT INTO article_feedback (
        feedback_id, content_id, locale, path, sentiment, reason, comment,
        created_at, updated_at
      ) VALUES (
        ${input.feedbackId}, ${input.contentId}, ${input.locale}, ${input.path},
        ${input.sentiment}, ${input.reason ?? null}, ${input.comment ?? null},
        ${input.submittedAt}, ${input.submittedAt}
      )
      ON CONFLICT (feedback_id) DO NOTHING
      RETURNING feedback_id
    `;
    if (inserted.length === 1) return "created" as const;
    const existing = await this.sql<{
      content_id: string;
      locale: string;
      path: string;
      sentiment: string;
      reason: string | null;
      comment: string | null;
    }[]>`
      SELECT content_id, locale, path, sentiment, reason, comment
      FROM article_feedback
      WHERE feedback_id = ${input.feedbackId}
    `;
    const row = existing[0];
    if (
      row && row.content_id === input.contentId && row.locale === input.locale &&
      row.path === input.path && row.sentiment === input.sentiment &&
      row.reason === (input.reason ?? null) && row.comment === (input.comment ?? null)
    ) return "duplicate" as const;
    return "conflict" as const;
  }

  async updateFeedback(input: ArticleFeedbackInput) {
    const rows = await this.sql<{ feedback_id: string }[]>`
      UPDATE article_feedback
      SET sentiment = ${input.sentiment}, reason = ${input.reason ?? null},
        comment = ${input.comment ?? null}, updated_at = ${input.submittedAt}
      WHERE feedback_id = ${input.feedbackId}
        AND content_id = ${input.contentId}
        AND locale = ${input.locale}
        AND path = ${input.path}
      RETURNING feedback_id
    `;
    return rows.length === 1;
  }

  async registerVisitor(visitorId: string, consentVersion: string, consentedAt: Date) {
    await this.sql`
      INSERT INTO analytics_visitors (
        visitor_id, consent_version, consented_at, last_seen_at
      ) VALUES (
        ${visitorId}, ${consentVersion}, ${consentedAt}, ${consentedAt}
      )
      ON CONFLICT (visitor_id) DO UPDATE SET
        consent_version = EXCLUDED.consent_version,
        consented_at = LEAST(analytics_visitors.consented_at, EXCLUDED.consented_at),
        last_seen_at = GREATEST(analytics_visitors.last_seen_at, EXCLUDED.last_seen_at)
    `;
  }

  async recordEvents(
    visitorId: string,
    session: SessionInput,
    events: AnalyticsEventInput[],
    receivedAt: Date,
  ) {
    return this.sql.begin(async (sql) => {
      if (!await touchVisitor(sql, visitorId, receivedAt)) {
        return { consentActive: false, inserted: 0 };
      }
      await upsertSession(sql, visitorId, session, receivedAt);
      let inserted = 0;
      for (const event of events) {
        const rows = await sql<{ event_id: string }[]>`
          INSERT INTO analytics_events (
            event_id, visitor_id, session_id, event_name, occurred_at,
            content_type, content_id, path, referrer,
            utm_source, utm_medium, utm_campaign, properties
          ) VALUES (
            ${event.eventId}, ${visitorId}, ${session.sessionId}, ${event.eventName},
            ${event.occurredAt}, ${event.contentType ?? null}, ${event.contentId ?? null},
            ${event.path}, ${event.referrer ?? null}, ${event.utmSource ?? null},
            ${event.utmMedium ?? null}, ${event.utmCampaign ?? null}, ${sql.json(event.properties)}
          )
          ON CONFLICT (event_id) DO NOTHING
          RETURNING event_id
        `;
        inserted += rows.length;
      }
      return { consentActive: true, inserted };
    });
  }

  async upsertEngagement(input: EngagementInput) {
    return this.sql.begin(async (sql) => {
      if (!await touchVisitor(sql, input.visitorId, input.occurredAt)) return false;
      await upsertSession(sql, input.visitorId, input.session, input.occurredAt);
      const rows = await sql<{ page_view_id: string }[]>`
        INSERT INTO analytics_page_engagement (
          page_view_id, visitor_id, session_id, content_type, content_id,
          locale, path, started_at, last_seen_at, engaged_ms,
          max_scroll_percent, completed, referrer, utm_source, utm_medium,
          utm_campaign, device_class
        ) VALUES (
          ${input.pageViewId}, ${input.visitorId}, ${input.session.sessionId},
          ${input.contentType}, ${input.contentId ?? null}, ${input.locale},
          ${input.path}, ${input.startedAt}, ${input.occurredAt}, ${input.engagedMs},
          ${input.maxScrollPercent}, ${input.completed}, ${input.referrer ?? null},
          ${input.utmSource ?? null}, ${input.utmMedium ?? null},
          ${input.utmCampaign ?? null}, ${input.session.deviceClass}
        )
        ON CONFLICT (page_view_id) DO UPDATE SET
          last_seen_at = GREATEST(analytics_page_engagement.last_seen_at, EXCLUDED.last_seen_at),
          engaged_ms = GREATEST(analytics_page_engagement.engaged_ms, EXCLUDED.engaged_ms),
          max_scroll_percent = GREATEST(
            analytics_page_engagement.max_scroll_percent,
            EXCLUDED.max_scroll_percent
          ),
          completed = analytics_page_engagement.completed OR EXCLUDED.completed
        WHERE analytics_page_engagement.visitor_id = EXCLUDED.visitor_id
        RETURNING page_view_id
      `;
      return rows.length === 1;
    });
  }

  async linkVisitor(visitorId: string, link: IdentityLink, now: Date) {
    return this.sql.begin(async (sql) => {
      const visitors = await sql<{ visitor_id: string }[]>`
        SELECT visitor_id FROM analytics_visitors
        WHERE visitor_id = ${visitorId}
        FOR UPDATE
      `;
      if (!visitors[0]) return false;
      const nonces = await sql<{ nonce: string }[]>`
        INSERT INTO analytics_identity_nonces (
          nonce, subscriber_id, expires_at, used_at, visitor_id
        ) VALUES (
          ${link.nonce}, ${link.subscriberId}, ${link.expiresAt}, ${now}, ${visitorId}
        )
        ON CONFLICT (nonce) DO NOTHING
        RETURNING nonce
      `;
      if (!nonces[0]) return false;
      await sql`
        UPDATE analytics_visitors
        SET subscriber_id = ${link.subscriberId}, linked_at = ${now}, last_seen_at = ${now}
        WHERE visitor_id = ${visitorId}
      `;
      return true;
    });
  }

  async deleteVisitor(visitorId: string) {
    await this.sql`DELETE FROM analytics_visitors WHERE visitor_id = ${visitorId}`;
  }

  async inspectRetention(cutoff: Date) {
    const rows = await this.sql<{
      visitors: string;
      sessions: string;
      events: string;
      engagements: string;
      feedback_comments: string;
    }[]>`
      SELECT
        (SELECT count(*) FROM analytics_visitors WHERE last_seen_at < ${cutoff}) AS visitors,
        (SELECT count(*) FROM analytics_sessions WHERE last_seen_at < ${cutoff}) AS sessions,
        (SELECT count(*) FROM analytics_events WHERE occurred_at < ${cutoff}) AS events,
        (SELECT count(*) FROM analytics_page_engagement WHERE last_seen_at < ${cutoff}) AS engagements,
        (SELECT count(*) FROM article_feedback
          WHERE comment IS NOT NULL AND updated_at < ${cutoff}) AS feedback_comments
    `;
    return toRetentionCounts(rows[0]);
  }

  async applyRetention(cutoff: Date) {
    const counts = await this.inspectRetention(cutoff);
    await this.sql.begin(async (sql) => {
      await sql`
        INSERT INTO analytics_daily_article_rollups (
          day, content_id, locale, device_class, page_views,
          unique_visitors, engaged_ms, completions
        )
        SELECT
          date_trunc('day', started_at)::date,
          content_id,
          locale,
          device_class,
          count(*)::bigint,
          count(DISTINCT visitor_id)::bigint,
          sum(engaged_ms)::bigint,
          count(*) FILTER (WHERE completed)::bigint
        FROM analytics_page_engagement
        WHERE last_seen_at < ${cutoff}
          AND content_type = 'article'
          AND content_id IS NOT NULL
        GROUP BY 1, 2, 3, 4
        ON CONFLICT (day, content_id, locale, device_class) DO UPDATE SET
          page_views = analytics_daily_article_rollups.page_views + EXCLUDED.page_views,
          unique_visitors = analytics_daily_article_rollups.unique_visitors + EXCLUDED.unique_visitors,
          engaged_ms = analytics_daily_article_rollups.engaged_ms + EXCLUDED.engaged_ms,
          completions = analytics_daily_article_rollups.completions + EXCLUDED.completions
      `;
      await sql`DELETE FROM analytics_events WHERE occurred_at < ${cutoff}`;
      await sql`DELETE FROM analytics_page_engagement WHERE last_seen_at < ${cutoff}`;
      await sql`DELETE FROM analytics_sessions WHERE last_seen_at < ${cutoff}`;
      await sql`DELETE FROM analytics_visitors WHERE last_seen_at < ${cutoff}`;
      await sql`DELETE FROM analytics_identity_nonces WHERE expires_at < ${cutoff}`;
      await sql`
        UPDATE article_feedback SET comment = NULL
        WHERE comment IS NOT NULL AND updated_at < ${cutoff}
      `;
    });
    return counts;
  }

  async health() {
    await this.sql`SELECT 1 FROM analytics_visitors LIMIT 1`;
  }

  async close() {
    await this.sql.end({ timeout: 5 });
  }
}

async function touchVisitor(
  sql: Sql | postgres.TransactionSql,
  visitorId: string,
  seenAt: Date,
) {
  const rows = await sql<{ visitor_id: string }[]>`
    UPDATE analytics_visitors
    SET last_seen_at = GREATEST(last_seen_at, ${seenAt})
    WHERE visitor_id = ${visitorId}
    RETURNING visitor_id
  `;
  return rows.length === 1;
}

async function upsertSession(
  sql: Sql | postgres.TransactionSql,
  visitorId: string,
  session: SessionInput,
  seenAt: Date,
) {
  await sql`
    INSERT INTO analytics_sessions (
      session_id, visitor_id, started_at, last_seen_at, locale, device_class
    ) VALUES (
      ${session.sessionId}, ${visitorId}, ${session.startedAt}, ${seenAt},
      ${session.locale}, ${session.deviceClass}
    )
    ON CONFLICT (session_id) DO UPDATE SET
      last_seen_at = GREATEST(analytics_sessions.last_seen_at, EXCLUDED.last_seen_at)
    WHERE analytics_sessions.visitor_id = EXCLUDED.visitor_id
  `;
}

function toRetentionCounts(row?: Record<string, string>) {
  return {
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
    events: Number(row?.events ?? 0),
    engagements: Number(row?.engagements ?? 0),
    feedbackComments: Number(row?.feedback_comments ?? 0),
  };
}
