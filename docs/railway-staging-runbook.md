# Railway staging runbook

This runbook creates Grove's persistent staging environment without creating or
populating production. Provider credentials, recipient addresses, service ids,
and generated secrets belong in Railway or the private operational inventory,
not in this repository.

## Guardrails

- Railway workspace compute alert: `$5`; compute hard limit: `$10`.
- Source branch: `develop` only.
- Use Railway-generated domains; custom domains wait for Phase 7.
- Keep PostgreSQL private. Do not generate a public database domain.
- Show drafts with `SHOW_DRAFTS=true`.
- Set `NEWSLETTER_RECIPIENT_ALLOWLIST` to the approved test addresses.
- Use the dedicated Resend staging segment. Do not reuse a future production
  segment.
- A normal deploy never sends a broadcast. Broadcast creation and sending remain
  explicit operations with the existing issue-state and confirmation gates.

## Topology

Create one Railway project named `grove`. Leave its automatically created
`production` environment empty, then create a persistent `staging` environment
containing:

1. `Postgres`;
2. `grove-newsletter-api`; and
3. `grove-web`.

Both application services use the repository root as their build context and
connect to `luccae11235/grove` on `develop`.

| Service | Railway config path | Public domain | Health check |
| --- | --- | --- | --- |
| `grove-newsletter-api` | `/apps/newsletter-api/railway.json` | Yes | `/health` |
| `grove-web` | `/apps/web/railway.json` | Yes | `/` |
| `Postgres` | Railway PostgreSQL image | No | Managed by Railway |

## Variables

Set API variables on `grove-newsletter-api`:

- `NODE_ENV=production`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `RESEND_SEGMENT_ID`
- `NEWSLETTER_RECIPIENT_ALLOWLIST`
- `NEWSLETTER_PUBLIC_SIGNUP=false`
- `NEWSLETTER_FROM=Grove <onboarding@resend.dev>` while using Resend's test domain
- `NEWSLETTER_REPLY_TO`
- `WEB_URL`
- `API_PUBLIC_URL`
- `ALLOWED_ORIGINS` equal to the exact web origin
- `EVENT_HASH_SALT`, generated independently for staging with at least 32 random
  bytes
- the optional rate-limit and confirmation-TTL variables from `.env.example`
  only when overriding their safe defaults

Set build variables on `grove-web`:

- `SITE_URL` equal to the generated web origin
- `BASE_PATH=/`
- `SHOW_DRAFTS=true`
- `PUBLIC_NEWSLETTER_API_URL` equal to the generated API origin
- `PUBLIC_PRIVACY_CONTACT_EMAIL`

Leave `NEWSLETTER_POSTAL_ADDRESS` unset until a legitimate sender address is
chosen. This keeps provider broadcasts unavailable while allowing the staging
site, signup, confirmation, migrations, and webhook infrastructure to be tested.

## Deployment order

1. Create the empty application services and PostgreSQL inside `staging`.
2. Connect both application services to the GitHub repository and `develop`.
3. Set the two config paths and generate the web and API Railway domains.
4. Create the Resend webhook at
   `https://<api-domain>/v1/webhooks/resend`, select the required delivery and
   contact events, and store its signing secret in Railway.
5. Add all API variables without printing secret values in logs or CLI output.
6. Deploy the API. Its committed pre-deploy command applies idempotent database
   migrations before the service starts.
7. Confirm `GET https://<api-domain>/health` returns `{"status":"ok"}`.
8. Add the web variables and deploy the web service.
9. Verify the generated site, draft visibility, privacy contact, and newsletter
   signup form.

## Acceptance checks

- Both application deployments are healthy and track `develop`.
- PostgreSQL has no public domain and contains staging data only.
- The web catalog visibly includes authored drafts.
- `/health` proves the API can reach PostgreSQL.
- An allowlisted signup creates one pending subscriber and sends one confirmation.
- Repeating that signup does not send a duplicate confirmation.
- A non-allowlisted signup returns the generic accepted response but creates no
  subscriber and sends no email.
- Confirmation activates only an allowlisted contact in the staging segment.
- Invalid tokens fail safely; signed webhook events are accepted and duplicates
  remain idempotent.
- No newsletter broadcast is created or sent during Phase 3.
- Railway usage alert and hard limit remain active.

Record the generated Railway project, environment, service, and domain ids in the
private operational inventory after verification. Phase 3 is complete only after
every acceptance check passes.
