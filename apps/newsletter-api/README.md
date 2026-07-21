# Grove newsletter API

The API owns consent and delivery telemetry. It keeps pending signups in
PostgreSQL, activates them only after a signed confirmation link is used, syncs
confirmed contacts to Resend, and records verified webhook events idempotently.

It intentionally does not render article or issue content. Astro builds the web,
HTML-email, plain-text, and manifest artifacts; the controlled broadcast command
hands those artifacts to Resend.

## Local commands

```bash
pnpm --filter @grove/newsletter-api typecheck
pnpm --filter @grove/newsletter-api test
pnpm --filter @grove/newsletter-api build
pnpm newsletter:migrate
pnpm dev:newsletter-api
```

Copy the newsletter variables from the repository `.env.example` into your
runtime environment. Tests use in-memory adapters and never require PostgreSQL or
Resend credentials.

## Public routes

- `GET /health` verifies the database connection;
- `POST /v1/subscriptions` starts double opt-in;
- `GET /v1/subscriptions/confirm?token=…` confirms consent; and
- `POST /v1/webhooks/resend` verifies and records Resend delivery events.

There is no public subscriber-list endpoint. Logs avoid email addresses, and
analytics store a keyed recipient hash instead of the recipient itself.
