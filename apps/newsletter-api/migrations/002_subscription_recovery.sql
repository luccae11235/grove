CREATE TABLE IF NOT EXISTS newsletter_subscription_actions (
  action_id uuid PRIMARY KEY,
  subscriber_id uuid NOT NULL REFERENCES newsletter_subscribers(subscriber_id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('confirm', 'unsubscribe')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  requested_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS newsletter_subscription_actions_subscriber_idx
  ON newsletter_subscription_actions (subscriber_id, action_type, requested_at DESC);

CREATE INDEX IF NOT EXISTS newsletter_subscription_actions_expiry_idx
  ON newsletter_subscription_actions (expires_at);

-- Preserve every outstanding confirmation issued before action tokens existed.
-- subscriber_id is already a UUID and is unique, so it is a safe migration id.
INSERT INTO newsletter_subscription_actions (
  action_id, subscriber_id, action_type, token_hash, expires_at, requested_at
)
SELECT
  subscriber_id, subscriber_id, 'confirm', confirmation_token_hash,
  confirmation_expires_at, consent_requested_at
FROM newsletter_subscribers
WHERE status = 'pending'
  AND confirmation_token_hash IS NOT NULL
  AND confirmation_expires_at IS NOT NULL
ON CONFLICT DO NOTHING;
