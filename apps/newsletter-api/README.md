# Grove newsletter API

The API owns consent and delivery telemetry. It keeps pending signups in
PostgreSQL, activates them only after a signed confirmation link is used, syncs
confirmed contacts to Resend, and records verified webhook events idempotently.
An append-only lifecycle table preserves request, confirmation, reactivation,
unsubscribe, bounce, complaint, and suppression times.
Each confirmation request has an independent expiring action token, so a resend
does not invalidate an earlier delivered link. Active readers receive status and
management details only through their inbox, which avoids a public
subscriber-enumeration endpoint.

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
runtime environment. The normal suite uses in-memory adapters and never requires
PostgreSQL or Resend credentials. Set `NEWSLETTER_TEST_DATABASE_URL` to a
disposable PostgreSQL database to run the migration/repository integration test;
the test isolates itself in a temporary schema.

`NEWSLETTER_FROM` is the marketing broadcast identity. Set
`NEWSLETTER_TRANSACTIONAL_FROM` to a separately verified sending subdomain for
confirmation and subscription-management messages. If it is omitted, the API
keeps using `NEWSLETTER_FROM` for compatibility.

## Public routes

- `GET /health` verifies the database connection;
- `POST /v1/subscriptions` starts double opt-in;
- `GET /v1/subscriptions/confirm?token=…` confirms consent;
- `POST /v1/subscriptions/manage` privately requests current status and a secure
  unsubscribe link;
- `POST /v1/subscriptions/unsubscribe` consumes that link after the reader
  explicitly confirms on the website; and
- `POST /v1/webhooks/resend` verifies and records Resend delivery events.

There is no public subscriber-list endpoint. Logs avoid email addresses, and
analytics store a keyed recipient hash instead of the recipient itself.
When the environment-specific observability link secret is configured, a
successful confirmation redirect also carries a 15-minute pseudonymous token
in its URL fragment. It contains the subscriber id, never the email address.
