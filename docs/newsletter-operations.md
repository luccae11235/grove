# Newsletter operations

This is the operating manual for publishing Grove every week. The website and
the newsletter share content, but they are different systems with different
failure modes.

## The mental model

```mermaid
flowchart LR
  Author["Author an evergreen article"] --> Issue["Write a dated issue"]
  Issue --> Preview["Build web, HTML email, and text email"]
  Preview --> Web["Publish canonical website"]
  Preview --> Approval["Review provider draft"]
  Signup["Reader requests subscription"] --> Pending["Pending consent in PostgreSQL"]
  Pending --> Confirm["Reader clicks confirmation"]
  Confirm --> Segment["Active Resend contact"]
  Web --> Approval
  Segment --> Send["Explicit send or schedule"]
  Approval --> Send
  Send --> Events["Signed delivery webhooks"]
  Events --> Report["Per-issue performance report"]
```

The article is the durable lesson. The issue is a dated editorial invitation to
that lesson. Improving an article later never rewrites the email readers already
received.

## One-time Railway and Resend setup

Create one Railway project with three services:

1. a PostgreSQL service;
2. `grove-web`, using `/apps/web/railway.json` as its config file; and
3. `grove-newsletter-api`, using `/apps/newsletter-api/railway.json`.

Keep the repository root as the build context because both Dockerfiles consume
workspace files. Give both application services public domains. Deploy the API
first, then rebuild the website with its final API URL.

Set these web build variables:

- `SITE_URL`: final public website origin;
- `BASE_PATH=/`;
- `SHOW_DRAFTS=true` in staging and `false` in production;
- `PUBLIC_NEWSLETTER_API_URL`: public API origin; and
- `PUBLIC_PRIVACY_CONTACT_EMAIL`: monitored address shown in the privacy notice;
- `NEWSLETTER_POSTAL_ADDRESS`: the real mailing address displayed in every issue.

Set the API variables documented in `.env.example`. Generate `EVENT_HASH_SALT`
as a long random secret. `ALLOWED_ORIGINS` must contain exact comma-separated web
origins; wildcard CORS is rejected at startup. Point `DATABASE_URL` to the
Railway PostgreSQL service using Railway's variable reference UI.

Staging must set `NEWSLETTER_RECIPIENT_ALLOWLIST` to explicit comma-separated
test addresses. Requests for other addresses receive the same accepted response
but create no subscriber and send no email. Contact activation is checked again,
and the broadcast command refuses a Resend segment containing any address outside
the allowlist. Keep `NEWSLETTER_PUBLIC_SIGNUP=false`. Opening signups later
requires removing the allowlist and explicitly setting
`NEWSLETTER_PUBLIC_SIGNUP=true`; startup rejects missing or contradictory policy.

In Resend:

1. verify the sending domain and choose `NEWSLETTER_FROM`;
2. create a `Grove weekly` segment and copy its id;
3. optionally create a topic when Grove has multiple preference streams;
4. create a webhook at
   `https://<api-domain>/v1/webhooks/resend` for sent, delivered, opened,
   clicked, bounced, complained, suppressed, and contact-updated events; and
5. copy its signing secret into `RESEND_WEBHOOK_SECRET`.

On the current private GitHub Free repository, add the variables and secrets
used by `newsletter-delivery.yml` at repository level. The workflow accepts
manual dispatches only from `luccae11235`, serializes delivery runs, and still
requires the issue-scoped send confirmation. A normal push, pull request, or
Railway deploy cannot send an issue. If the repository later becomes public or
moves to a plan that supports protected private environments, move the same
configuration into a protected `newsletter-production` environment.

Before opening signups, review `/privacy` for the operator's jurisdiction and run
the retention dry run. The form remains disabled unless both the API URL and a
public privacy contact are present.

## Proving the system works before launch

The repeatable provider-edge proof is staging-only, requires the fail-closed
recipient allowlist, and refuses non-staging Railway URLs. It sends only to
Resend's designated test recipients, waits for signed webhooks, verifies
PostgreSQL state, and removes its synthetic subscribers and contacts:

```bash
railway run --environment staging --service grove-newsletter-api -- sh -c \
  'DATABASE_URL="$(railway variable list --environment staging --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)" \
  pnpm newsletter:prove:staging --confirm PROVE:staging-newsletter'
```

This proves delivered, bounced, complained, suppressed, unsubscribe, invalid
token, unsigned-webhook rejection, and database health paths. It does not replace
the internal issue send and report check below.

Use an address you control and complete this sequence:

1. confirm `GET /health` returns `{"status":"ok"}`;
2. submit the website form and verify only one confirmation email arrives;
3. click the link and verify the browser reaches `/newsletter/confirmed`;
4. submit the same address again and verify it does not receive another
   confirmation;
5. change Issue 001 to `ready`, configure a real postal address, run
   `pnpm newsletter:prepare`, and create a provider draft—not a send;
6. inspect desktop, mobile, links, plain text, sender, reply-to, footer, and spam
   placement in at least Gmail and one non-Gmail mailbox;
7. publish the article and issue on the website, then perform an explicit send to
   a tiny internal segment; and
8. confirm delivery and click events appear in
   `pnpm newsletter:report --issue 2026-001`.

Also test an expired or altered confirmation link, an unsubscribe, and a test
bounce address before opening public signups. Database backups should be enabled
before collecting real subscribers.

## The weekly publishing rhythm

### 1. Scaffold and write

```bash
pnpm newsletter:new-issue --issue 2026-002 \
  --subject "A subject that creates useful tension" \
  --article stable-article-id
```

Write the evergreen article first. Use the issue to set up one question, explain
what the interaction reveals, and point back to the article. Keep `status: draft`
while writing.

### 2. Preview and validate

```bash
pnpm newsletter:prepare
pnpm preview
```

Review `/newsletter/`, the issue web URL, the HTML email preview under
`/newsletter/email/`, and its `.txt` sibling. A pull request touching issue files
also produces a downloadable `newsletter-preview` artifact.

### 3. Publish the website

Set the article and issue to `published`, add `publishedAt`, merge, and wait for
the Railway web health check. Open the canonical article and issue URLs from a
private browser window. The website must exist before the email points readers
to it.

### 4. Create and review a provider draft

Run the `Controlled newsletter delivery` GitHub workflow with action `draft`.
This creates exactly one Resend broadcast and records its provider id. Re-running
the command for the same issue is refused, which prevents accidental duplicates.

### 5. Send or schedule deliberately

Run the workflow again with action `send` or `schedule` and enter
`SEND:<issue-id>` in the confirmation field. The issue must be published, the
postal address must be present, artifacts must contain an unsubscribe link, and
the protected environment reviewer must approve the job.

When a provider draft already exists, the final command refreshes it from the
current validated artifacts and then sends that same broadcast. A sent or
scheduled broadcast cannot be reused, which prevents duplicate delivery.

### 6. Read the report

```bash
pnpm newsletter:report --issue 2026-001
```

The report contains unique-recipient counts and these rates:

- delivery rate = delivered / sent;
- unique open rate = unique openers / delivered; and
- unique click rate = unique clickers / delivered.

It also reports bounces, complaints, suppressions, and top links. Webhook ids are
deduplicated because delivery providers retry and events can arrive out of order.
Recipient addresses are not copied into the analytics table.

Run retention maintenance monthly. It is a dry run unless the exact deletion
confirmation is supplied:

```bash
pnpm newsletter:retention
pnpm newsletter:retention --apply --confirm DELETE:newsletter-retention
```

This deletes unconfirmed requests older than 30 days and delivery telemetry older
than 400 days. It does not delete active, unsubscribed, bounced, complained, or
suppressed consent records.

Treat opens as directional: image blocking, privacy proxies, and bot activity can
distort them. Clicks, replies, article engagement, and week-over-week retention
are stronger editorial signals. Begin with Grove's own four-issue baseline rather
than generic industry targets. Investigate any complaint immediately and pause
sending if the sender domain, webhook ingestion, or suppression sync is unhealthy.

## Recovery rules

- Website failed: do not send; fix the canonical destination first.
- API failed: the static website remains readable, but disable or clearly mark
  signup until `/health` recovers.
- Confirmation email failed: the address remains pending and may safely request a
  fresh token.
- Webhook signature failed: return an error and inspect the configured signing
  secret; never record an unverified event.
- Duplicate delivery command: stop and inspect the stored provider broadcast id.
- Database restore: replay newer Resend webhooks if available, then reconcile
  active and suppressed contacts before the next send.
