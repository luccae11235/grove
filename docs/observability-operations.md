# First-party observability operations

## Ownership and boundaries

The static website owns the consent interface and browser measurement. The
observability API validates and persists only consented data. The newsletter API
owns email consent and status history, and issues a 15-minute, single-use link
token after confirmation when `OBSERVABILITY_LINK_SECRET` is configured.

Staging and production use separate Railway environments, PostgreSQL databases,
public origins, and link secrets. The observability service shares only the
database belonging to its own environment. There is no public reporting route.

## Provisioning and rollback

1. Deploy the newsletter API so migration `002_subscriber_lifecycle.sql` applies.
2. Create `grove-observability-api` from
   `apps/observability-api/railway.json` and reference the same-environment
   PostgreSQL `DATABASE_URL`.
3. Configure `DEPLOYMENT_ENV`, exact `ALLOWED_ORIGINS`, `CONSENT_VERSION`,
   rate limits, and a new 32-byte-or-longer `OBSERVABILITY_LINK_SECRET`.
4. Put the same secret on the same-environment newsletter API. Never copy it
   between staging and production.
5. Give the service a Railway domain. After staging proof, attach
   `observe.aflora.page` in production and configure DNS/HTTPS.
6. Build the website with `PUBLIC_OBSERVABILITY_API_URL`,
   `PUBLIC_OBSERVABILITY_CONSENT_VERSION`, and
   `PUBLIC_OBSERVABILITY_ENABLED=true` only after service health, CORS, privacy
   copy, and withdrawal have been reviewed.

Rollback is the web build switch: set `PUBLIC_OBSERVABILITY_ENABLED=false` and
redeploy the static website. The additive service and schema may remain for
reports, exports, deletion requests, and retention.

## Staging and production proof

Run the self-cleaning proof only against staging:

```bash
railway run --environment staging --service grove-observability-api -- \
  pnpm observability:prove:staging \
  --api-url https://<staging-observability-domain> \
  --confirm PROVE:staging-observability
```

It verifies health, rejection before consent, persistence after consent,
cumulative engagement, and revocation, then removes the synthetic visitor.

After production deployment, run the public smoke with
`--observability-url https://observe.aflora.page --expect-observability enabled`.
Then use one owner-controlled browser to accept measurement, read an article,
confirm one controlled subscription, and verify it with the report command. Do
not create synthetic production subscribers.

## Reports, exports, and retention

```bash
pnpm observability:report --from 2026-07-01 --to 2026-08-01
pnpm observability:report --article decision-trees-from-scratch
pnpm observability:report --subscriber reader@example.com
pnpm observability:report --subscriber reader@example.com --include-email
pnpm observability:export --scope aggregate --format csv
pnpm observability:export --scope visitor --format ndjson
pnpm observability:retention
pnpm observability:retention --apply --confirm DELETE:observability-retention
```

Retention uses a UTC-day cutoff 400 days in the past. It rolls old article
engagement into non-identifying daily totals before deleting raw events,
engagement, sessions, profiles, and expired link nonces. Withdrawal through the
site deletes that browser profile immediately.

Run the dry run before every applied retention. Schedule the applied command
only after staging verification and a backup/restore proof are complete.

For Grafana, create a distinct login in each environment and grant only the
reporting views. Run the following as the database owner, replacing the password
through the PostgreSQL client rather than committing it:

```sql
CREATE ROLE grove_observability_reader
  LOGIN PASSWORD '<generate-a-unique-environment-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO grove_observability_reader',
  current_database()
)\gexec
GRANT USAGE ON SCHEMA public TO grove_observability_reader;
GRANT SELECT ON
  observability_current_subscribers,
  observability_subscriber_timeline,
  observability_daily_subscriber_lifecycle,
  observability_daily_articles,
  observability_consenting_reader_cohorts,
  observability_acquisition,
  observability_locale_devices
TO grove_observability_reader;
```

Do not grant table privileges or broad default privileges. Add future reporting
views to the explicit grant list, and rotate the reader password independently
in staging and production.

## Incident signals

- `/health` proves the service can query the analytics schema.
- Structured logs contain environment, request id, method, route path, status,
  duration, and sanitized error name; they exclude bodies, emails, tokens, query
  strings, and network addresses.
- The platform smoke proves health, exact-origin CORS, and the website switch.
- Disable the website switch if ingestion errors persist. Reading and newsletter
  delivery continue independently.
