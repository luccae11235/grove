CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  subscriber_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'unsubscribed', 'bounced', 'complained', 'suppressed')),
  locale text NOT NULL CHECK (locale IN ('en', 'pt-BR')),
  source text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  confirmation_token_hash text UNIQUE,
  confirmation_expires_at timestamptz,
  consent_requested_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  provider_contact_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON newsletter_subscribers (status);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirmed_at_idx
  ON newsletter_subscribers (confirmed_at);

CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
  issue_id text PRIMARY KEY,
  provider_broadcast_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'sent')),
  subject text NOT NULL,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_events (
  svix_id text PRIMARY KEY,
  event_type text NOT NULL,
  event_created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  provider_email_id text,
  provider_broadcast_id text,
  recipient_hash text,
  clicked_url text,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS newsletter_events_broadcast_idx
  ON newsletter_events (provider_broadcast_id, event_type);

CREATE INDEX IF NOT EXISTS newsletter_events_created_idx
  ON newsletter_events (event_created_at);
