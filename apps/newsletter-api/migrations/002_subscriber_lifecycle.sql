CREATE TABLE IF NOT EXISTS newsletter_subscriber_events (
  event_id bigserial PRIMARY KEY,
  -- Deliberately not a foreign key: stale pending subscriber rows may be
  -- deleted while their pseudonymous consent history remains durable.
  subscriber_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'subscription_requested',
    'reactivation_requested',
    'confirmed',
    'unsubscribed',
    'bounced',
    'complained',
    'suppressed',
    'status_backfilled'
  )),
  previous_status text CHECK (
    previous_status IS NULL OR
    previous_status IN ('pending', 'active', 'unsubscribed', 'bounced', 'complained', 'suppressed')
  ),
  new_status text NOT NULL CHECK (
    new_status IN ('pending', 'active', 'unsubscribed', 'bounced', 'complained', 'suppressed')
  ),
  occurred_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('signup', 'confirmation', 'resend_webhook', 'backfill')),
  source_event_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscriber_events_subscriber_idx
  ON newsletter_subscriber_events (subscriber_id, occurred_at);

CREATE INDEX IF NOT EXISTS newsletter_subscriber_events_type_idx
  ON newsletter_subscriber_events (event_type, occurred_at);

INSERT INTO newsletter_subscriber_events (
  subscriber_id,
  event_type,
  previous_status,
  new_status,
  occurred_at,
  source,
  source_event_id
)
SELECT
  subscriber_id,
  'status_backfilled',
  NULL,
  status,
  CASE
    WHEN status = 'active' THEN COALESCE(confirmed_at, updated_at, created_at)
    ELSE COALESCE(updated_at, confirmed_at, consent_requested_at, created_at)
  END,
  'backfill',
  'backfill:' || subscriber_id::text || ':' || status
FROM newsletter_subscribers
ON CONFLICT (source_event_id) DO NOTHING;

CREATE OR REPLACE VIEW observability_current_subscribers AS
SELECT
  subscriber_id,
  email,
  status,
  locale,
  source,
  consent_requested_at,
  confirmed_at,
  created_at,
  updated_at
FROM newsletter_subscribers;

CREATE OR REPLACE VIEW observability_subscriber_timeline AS
SELECT
  event_id,
  subscriber_id,
  event_type,
  previous_status,
  new_status,
  occurred_at,
  source
FROM newsletter_subscriber_events;

CREATE OR REPLACE VIEW observability_daily_subscriber_lifecycle AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  event_type,
  new_status,
  count(*)::bigint AS event_count,
  count(DISTINCT subscriber_id)::bigint AS unique_subscribers
FROM newsletter_subscriber_events
GROUP BY 1, 2, 3;
