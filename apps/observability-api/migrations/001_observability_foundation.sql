CREATE TABLE IF NOT EXISTS observability_schema_migrations (
  migration_name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_visitors (
  visitor_id uuid PRIMARY KEY,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  subscriber_id uuid,
  linked_at timestamptz,
  last_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_visitors_subscriber_idx
  ON analytics_visitors (subscriber_id) WHERE subscriber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_visitors_last_seen_idx
  ON analytics_visitors (last_seen_at);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  locale text NOT NULL CHECK (locale IN ('en', 'pt-BR')),
  device_class text NOT NULL CHECK (device_class IN ('mobile', 'tablet', 'desktop'))
);

CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_idx
  ON analytics_sessions (visitor_id, started_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (event_name IN (
    'page_view',
    'lab_started',
    'lab_completed',
    'cta_clicked',
    'newsletter_signup_submitted',
    'newsletter_signup_accepted',
    'newsletter_confirmed',
    'outbound_navigation',
    'web_vital',
    'client_error'
  )),
  occurred_at timestamptz NOT NULL,
  content_type text CHECK (content_type IS NULL OR content_type IN ('page', 'article', 'issue')),
  content_id text,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx
  ON analytics_events (occurred_at, event_name);

CREATE INDEX IF NOT EXISTS analytics_events_content_idx
  ON analytics_events (content_id, occurred_at) WHERE content_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS analytics_page_engagement (
  page_view_id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('page', 'article', 'issue')),
  content_id text,
  locale text NOT NULL CHECK (locale IN ('en', 'pt-BR')),
  path text NOT NULL,
  started_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  engaged_ms bigint NOT NULL DEFAULT 0 CHECK (engaged_ms >= 0),
  max_scroll_percent smallint NOT NULL DEFAULT 0 CHECK (
    max_scroll_percent >= 0 AND max_scroll_percent <= 100
  ),
  completed boolean NOT NULL DEFAULT false,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_class text NOT NULL CHECK (device_class IN ('mobile', 'tablet', 'desktop')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_engagement_content_idx
  ON analytics_page_engagement (content_id, started_at) WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_engagement_last_seen_idx
  ON analytics_page_engagement (last_seen_at);

CREATE TABLE IF NOT EXISTS analytics_identity_nonces (
  nonce text PRIMARY KEY,
  subscriber_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NOT NULL,
  visitor_id uuid NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_daily_article_rollups (
  day date NOT NULL,
  content_id text NOT NULL,
  locale text NOT NULL,
  device_class text NOT NULL,
  page_views bigint NOT NULL,
  unique_visitors bigint NOT NULL,
  engaged_ms bigint NOT NULL,
  completions bigint NOT NULL,
  PRIMARY KEY (day, content_id, locale, device_class)
);

CREATE OR REPLACE VIEW observability_daily_articles AS
WITH current_activity AS (
  SELECT
    date_trunc('day', started_at)::date AS day,
    content_id,
    locale,
    device_class,
    count(*)::bigint AS page_views,
    count(DISTINCT visitor_id)::bigint AS unique_visitors,
    sum(engaged_ms)::bigint AS engaged_ms,
    count(*) FILTER (WHERE completed)::bigint AS completions
  FROM analytics_page_engagement
  WHERE content_type = 'article' AND content_id IS NOT NULL
  GROUP BY 1, 2, 3, 4
)
SELECT * FROM current_activity
UNION ALL
SELECT * FROM analytics_daily_article_rollups;

CREATE OR REPLACE VIEW observability_consenting_reader_cohorts AS
SELECT
  date_trunc('month', consented_at)::date AS consent_month,
  count(*)::bigint AS visitors,
  count(*) FILTER (WHERE subscriber_id IS NOT NULL)::bigint AS linked_subscribers
FROM analytics_visitors
GROUP BY 1;

CREATE OR REPLACE VIEW observability_acquisition AS
SELECT
  date_trunc('day', started_at)::date AS day,
  referrer,
  utm_source,
  utm_medium,
  utm_campaign,
  count(*)::bigint AS page_views,
  count(DISTINCT visitor_id)::bigint AS unique_visitors
FROM analytics_page_engagement
GROUP BY 1, 2, 3, 4, 5;

CREATE OR REPLACE VIEW observability_locale_devices AS
SELECT
  date_trunc('day', started_at)::date AS day,
  locale,
  device_class,
  count(*)::bigint AS page_views,
  count(DISTINCT visitor_id)::bigint AS unique_visitors,
  sum(engaged_ms)::bigint AS engaged_ms
FROM analytics_page_engagement
GROUP BY 1, 2, 3;
