import postgres from "postgres";
import { dateArgument, parseArguments } from "./arguments.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for observability reports.");
const arguments_ = parseArguments(process.argv.slice(2));
const to = dateArgument(arguments_.to, new Date());
const from = dateArgument(arguments_.from, new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000));
if (from >= to) throw new Error("--from must be earlier than --to.");
const article = typeof arguments_.article === "string" ? arguments_.article : undefined;
const subscriber = typeof arguments_.subscriber === "string" ? arguments_.subscriber : undefined;
const includeEmail = arguments_["include-email"] === true;
const includeFeedbackComments = arguments_["include-feedback-comments"] === true;
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

try {
  const subscriberId = subscriber ? await resolveSubscriber(sql, subscriber) : undefined;
  const [summary] = await sql<{
    visitors: string;
    linked_visitors: string;
    page_views: string;
    engaged_ms: string;
    completions: string;
  }[]>`
    SELECT
      count(DISTINCT e.visitor_id)::text AS visitors,
      count(DISTINCT e.visitor_id) FILTER (WHERE v.subscriber_id IS NOT NULL)::text AS linked_visitors,
      count(*)::text AS page_views,
      coalesce(sum(e.engaged_ms), 0)::text AS engaged_ms,
      count(*) FILTER (WHERE e.completed)::text AS completions
    FROM analytics_page_engagement e
    JOIN analytics_visitors v ON v.visitor_id = e.visitor_id
    WHERE e.started_at >= ${from}
      AND e.started_at < ${to}
      ${article ? sql`AND e.content_id = ${article}` : sql``}
      ${subscriberId ? sql`AND v.subscriber_id = ${subscriberId}` : sql``}
  `;
  const articles = await sql<{
    content_id: string;
    page_views: string;
    unique_visitors: string;
    engaged_ms: string;
    completions: string;
  }[]>`
    SELECT
      coalesce(content_id, path) AS content_id,
      count(*)::text AS page_views,
      count(DISTINCT visitor_id)::text AS unique_visitors,
      coalesce(sum(engaged_ms), 0)::text AS engaged_ms,
      count(*) FILTER (WHERE completed)::text AS completions
    FROM analytics_page_engagement
    WHERE started_at >= ${from} AND started_at < ${to}
      ${article ? sql`AND content_id = ${article}` : sql``}
      ${subscriberId
        ? sql`AND visitor_id IN (
            SELECT visitor_id FROM analytics_visitors WHERE subscriber_id = ${subscriberId}
          )`
        : sql``}
    GROUP BY 1
    ORDER BY sum(engaged_ms) DESC, coalesce(content_id, path)
    LIMIT 50
  `;
  const feedback = await sql<{
    content_id: string;
    sentiment: string;
    reason: string | null;
    responses: string;
  }[]>`
    SELECT content_id, sentiment, reason, count(*)::text AS responses
    FROM article_feedback
    WHERE created_at >= ${from} AND created_at < ${to}
      ${article ? sql`AND content_id = ${article}` : sql``}
    GROUP BY content_id, sentiment, reason
    ORDER BY content_id, sentiment, reason NULLS FIRST
  `;
  const feedbackComments = includeFeedbackComments
    ? await sql<{ content_id: string; created_at: Date; comment: string }[]>`
        SELECT content_id, created_at, comment
        FROM article_feedback
        WHERE created_at >= ${from} AND created_at < ${to}
          AND comment IS NOT NULL
          ${article ? sql`AND content_id = ${article}` : sql``}
        ORDER BY created_at, feedback_id
        LIMIT 500
      `
    : [];
  const subscriberCounts = await sql<{ status: string; count: string }[]>`
    SELECT status, count(*)::text AS count
    FROM newsletter_subscribers
    GROUP BY status
    ORDER BY status
  `;
  const lifecycle = await sql<{ event_type: string; count: string }[]>`
    SELECT event_type, count(*)::text AS count
    FROM newsletter_subscriber_events
    WHERE occurred_at >= ${from} AND occurred_at < ${to}
      ${subscriberId ? sql`AND subscriber_id = ${subscriberId}` : sql``}
    GROUP BY event_type
    ORDER BY event_type
  `;
  const subscriberDetail = subscriberId
    ? (await sql<{
        subscriber_id: string;
        email: string;
        status: string;
        locale: string;
        confirmed_at: Date | null;
      }[]>`
        SELECT subscriber_id, email, status, locale, confirmed_at
        FROM newsletter_subscribers
        WHERE subscriber_id = ${subscriberId}
      `)[0]
    : undefined;
  const report = {
    window: { from: from.toISOString(), to: to.toISOString() },
    filters: { article: article ?? null, subscriberId: subscriberId ?? null },
    summary: {
      visitors: Number(summary?.visitors ?? 0),
      linkedVisitors: Number(summary?.linked_visitors ?? 0),
      pageViews: Number(summary?.page_views ?? 0),
      engagedSeconds: Math.round(Number(summary?.engaged_ms ?? 0) / 1000),
      completions: Number(summary?.completions ?? 0),
    },
    subscribers: Object.fromEntries(subscriberCounts.map((row) => [row.status, Number(row.count)])),
    subscriberLifecycle: Object.fromEntries(lifecycle.map((row) => [row.event_type, Number(row.count)])),
    subscriber: subscriberDetail ? {
      subscriberId: subscriberDetail.subscriber_id,
      ...(includeEmail ? { email: subscriberDetail.email } : {}),
      status: subscriberDetail.status,
      locale: subscriberDetail.locale,
      confirmedAt: subscriberDetail.confirmed_at?.toISOString() ?? null,
    } : null,
    articles: articles.map((row) => ({
      contentId: row.content_id,
      pageViews: Number(row.page_views),
      uniqueVisitors: Number(row.unique_visitors),
      engagedSeconds: Math.round(Number(row.engaged_ms) / 1000),
      completions: Number(row.completions),
    })),
    feedback: summarizeFeedback(feedback),
    feedbackComments: feedbackComments.map((row) => ({
      contentId: row.content_id,
      createdAt: row.created_at.toISOString(),
      comment: row.comment,
    })),
  };
  if (arguments_.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    writeHumanReport(report);
  }
} finally {
  await sql.end({ timeout: 5 });
}

async function resolveSubscriber(
  sql: ReturnType<typeof postgres>,
  value: string,
) {
  const rows = await sql<{ subscriber_id: string }[]>`
    SELECT subscriber_id
    FROM newsletter_subscribers
    WHERE subscriber_id::text = ${value} OR email = ${value.toLowerCase()}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error("Subscriber not found.");
  return rows[0].subscriber_id;
}

function writeHumanReport(report: {
  window: { from: string; to: string };
  filters: { article: string | null; subscriberId: string | null };
  summary: {
    visitors: number;
    linkedVisitors: number;
    pageViews: number;
    engagedSeconds: number;
    completions: number;
  };
  subscribers: Record<string, number>;
  subscriberLifecycle: Record<string, number>;
  subscriber: {
    subscriberId: string;
    email?: string;
    status: string;
    locale: string;
    confirmedAt: string | null;
  } | null;
  articles: Array<{
    contentId: string;
    pageViews: number;
    uniqueVisitors: number;
    engagedSeconds: number;
    completions: number;
  }>;
  feedback: Array<{
    contentId: string;
    responses: number;
    helpful: number;
    notHelpful: number;
    reasons: Record<string, number>;
  }>;
  feedbackComments: Array<{ contentId: string; createdAt: string; comment: string }>;
}) {
  const lines = [
    `Observability report ${report.window.from} to ${report.window.to}`,
    `Visitors: ${report.summary.visitors} (${report.summary.linkedVisitors} linked)`,
    `Page views: ${report.summary.pageViews}`,
    `Engaged time: ${report.summary.engagedSeconds}s`,
    `Completions: ${report.summary.completions}`,
    "",
    "Subscribers by status:",
    ...entriesOrNone(report.subscribers),
    "",
    "Lifecycle events:",
    ...entriesOrNone(report.subscriberLifecycle),
  ];
  if (report.subscriber) {
    lines.push(
      "",
      `Subscriber: ${report.subscriber.subscriberId}`,
      `Status: ${report.subscriber.status}`,
      `Locale: ${report.subscriber.locale}`,
      `Confirmed: ${report.subscriber.confirmedAt ?? "not confirmed"}`,
    );
    if (report.subscriber.email) lines.push(`Email: ${report.subscriber.email}`);
  }
  lines.push(
    "",
    "Articles:",
    ...(
      report.articles.length
        ? report.articles.map((article) =>
            `${article.contentId}: ${article.pageViews} views, ${article.uniqueVisitors} visitors, ${article.engagedSeconds}s engaged, ${article.completions} completions`
          )
        : ["(none)"]
    ),
  );
  lines.push(
    "",
    "Feedback:",
    ...(report.feedback.length
      ? report.feedback.map((item) => {
          const percent = item.responses ? Math.round((item.helpful / item.responses) * 100) : 0;
          const reasons = Object.entries(item.reasons)
            .map(([reason, count]) => `${reason}=${count}`)
            .join(", ") || "none";
          return `${item.contentId}: ${item.responses} responses, ${item.helpful} helpful (${percent}%), ${item.notHelpful} not helpful; reasons: ${reasons}`;
        })
      : ["(none)"]),
  );
  if (report.feedbackComments.length) {
    lines.push(
      "",
      "Feedback comments:",
      ...report.feedbackComments.map((item) =>
        `${item.createdAt} ${item.contentId}: ${JSON.stringify(item.comment)}`
      ),
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function summarizeFeedback(rows: Array<{
  content_id: string;
  sentiment: string;
  reason: string | null;
  responses: string;
}>) {
  const summaries = new Map<string, {
    contentId: string;
    responses: number;
    helpful: number;
    notHelpful: number;
    reasons: Record<string, number>;
  }>();
  for (const row of rows) {
    const summary = summaries.get(row.content_id) ?? {
      contentId: row.content_id,
      responses: 0,
      helpful: 0,
      notHelpful: 0,
      reasons: {},
    };
    const count = Number(row.responses);
    summary.responses += count;
    if (row.sentiment === "helpful") summary.helpful += count;
    else summary.notHelpful += count;
    if (row.reason) summary.reasons[row.reason] = (summary.reasons[row.reason] ?? 0) + count;
    summaries.set(row.content_id, summary);
  }
  return [...summaries.values()];
}

function entriesOrNone(entries: Record<string, number>) {
  const values = Object.entries(entries);
  return values.length ? values.map(([name, count]) => `${name}: ${count}`) : ["(none)"];
}
