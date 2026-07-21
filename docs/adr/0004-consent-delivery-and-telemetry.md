# ADR 0004: Separate consent, rendering, delivery, and telemetry

- Status: accepted
- Date: 2026-07-18

## Context

Grove needs weekly email distribution without coupling article publication to a
vendor dashboard or allowing a deploy to send mail. Subscriber consent and
delivery telemetry also require a durable, privacy-conscious record.

## Decision

- Astro owns issue metadata and produces web, HTML-email, plain-text, and manifest
  artifacts from one typed source.
- PostgreSQL owns pending and confirmed consent, suppression state, broadcast ids,
  and deduplicated webhook events.
- Resend sends transactional confirmations, manages deliverable contacts and
  segments, and delivers broadcasts.
- A contact is created in Resend only after the reader uses a time-limited
  double-opt-in link.
- Webhook signatures are verified against the raw body before ingestion. The
  provider event id is the idempotency key.
- Delivery requires a published issue, a physical address, unsubscribe markers,
  an exact command confirmation, and a separate protected workflow.
- Metrics store a keyed recipient hash rather than an email address.

## Consequences

The website can deploy and remain available independently from the API. Providers
can be replaced behind a narrow adapter, while consent remains portable. The
system has more setup than an embedded newsletter form, but retries, suppression,
auditing, and performance reports are explicit and testable.

In-memory rate limiting assumes one API replica for the initial launch. Scaling
the service horizontally requires a shared limiter before adding replicas.
