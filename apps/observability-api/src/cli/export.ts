import postgres from "postgres";
import { dateArgument, parseArguments } from "./arguments.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for observability exports.");
const arguments_ = parseArguments(process.argv.slice(2));
const to = dateArgument(arguments_.to, new Date());
const from = dateArgument(arguments_.from, new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000));
const format = arguments_.format === "ndjson" ? "ndjson" : "csv";
const scope = arguments_.scope === "visitor" ? "visitor" : "aggregate";
const includeEmail = arguments_["include-email"] === true;
if (from >= to) throw new Error("--from must be earlier than --to.");
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

try {
  const rows = scope === "visitor"
    ? await sql<Record<string, unknown>[]>`
        SELECT
          e.started_at,
          e.visitor_id,
          v.subscriber_id,
          ${includeEmail ? sql`s.email` : sql`NULL::text AS email`},
          e.content_type,
          e.content_id,
          e.locale,
          e.path,
          e.engaged_ms,
          e.max_scroll_percent,
          e.completed,
          e.referrer,
          e.utm_source,
          e.utm_medium,
          e.utm_campaign,
          e.device_class
        FROM analytics_page_engagement e
        JOIN analytics_visitors v ON v.visitor_id = e.visitor_id
        LEFT JOIN newsletter_subscribers s ON s.subscriber_id = v.subscriber_id
        WHERE e.started_at >= ${from} AND e.started_at < ${to}
        ORDER BY e.started_at, e.page_view_id
      `
    : await sql<Record<string, unknown>[]>`
        SELECT *
        FROM observability_daily_articles
        WHERE day >= ${from.toISOString().slice(0, 10)}::date
          AND day < ${to.toISOString().slice(0, 10)}::date
        ORDER BY day, content_id, locale, device_class
      `;
  if (format === "ndjson") {
    for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  } else {
    writeCsv(rows);
  }
} finally {
  await sql.end({ timeout: 5 });
}

function writeCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  process.stdout.write(`${headers.map(csvValue).join(",")}\n`);
  for (const row of rows) {
    process.stdout.write(`${headers.map((header) => csvValue(row[header])).join(",")}\n`);
  }
}

function csvValue(value: unknown) {
  const normalized = value instanceof Date
    ? value.toISOString()
    : value == null
      ? ""
      : String(value);
  return `"${normalized.replaceAll("\"", "\"\"")}"`;
}
