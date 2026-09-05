CREATE TABLE IF NOT EXISTS newsletter_confirmation_reminders (
  batch_id text NOT NULL,
  subscriber_id uuid NOT NULL REFERENCES newsletter_subscribers(subscriber_id) ON DELETE CASCADE,
  action_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('reserved', 'sent', 'unknown')),
  provider_email_id text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, subscriber_id)
);
CREATE INDEX IF NOT EXISTS newsletter_confirmation_reminders_subscriber_idx
  ON newsletter_confirmation_reminders (subscriber_id, attempted_at DESC);
