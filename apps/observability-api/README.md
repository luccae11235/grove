# Grove observability API

This service accepts explicitly consented first-party readership events and
intentional anonymous article-feedback submissions. Feedback is stored without
an analytics visitor or subscriber identity.
It stores browser profiles, sessions, bounded event types, cumulative page
engagement, and optional confirmation-browser subscriber links in the
environment-local PostgreSQL database.

It intentionally has no public read or admin endpoint. Operators use the
report/export commands or a database role restricted to reporting views.

```bash
pnpm --filter @grove/observability-api typecheck
pnpm --filter @grove/observability-api test
pnpm observability:migrate
pnpm dev:observability-api
pnpm observability:report --from 2026-07-01 --to 2026-08-01
pnpm observability:report --article decision-trees-from-scratch
pnpm observability:report --article decision-trees-from-scratch --include-feedback-comments
pnpm observability:export --scope aggregate --format csv
pnpm observability:export --scope feedback --format csv
pnpm observability:retention
```

Public routes are `GET /health`, `POST /v1/visitors`, `POST /v1/events`,
`PUT /v1/engagement/:pageViewId`, `POST /v1/identity/link`, and
`DELETE /v1/visitors/:visitorId`, plus `POST /v1/feedback` and
`PUT /v1/feedback/:feedbackId`.

No route accepts an email address, arbitrary property name, query-bearing path,
full user-agent string, or stored network address. Feedback accepts only a
bounded article id, locale, path, sentiment, reason, and optional 500-character
comment. The address used by the
in-memory rate limiter is discarded with its short process window.
