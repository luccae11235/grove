# Grove delivery phases

This plan takes Grove from a versioned repository to a public, recoverable
publication and newsletter. The phases are ordered gates: a later phase may be
prepared early, but it is not complete until its preceding gate is complete.
The operational status and actionable checklists live in
[`task-queue.md`](task-queue.md).

## Phase 1 — Organize GitHub

Create the official repository, version and publish the current work, open the
first pull request, and protect `main`. The gate is complete when the code has a
reviewable history and direct unverified changes cannot reach `main`.

Current constraint: the repository is private and GitHub reports that branch
protection requires GitHub Pro or a public repository. Until that changes, the
team must enforce pull requests procedurally.

## Phase 2 — Validate CI

Run tests, type checking, a production build, and a newsletter preview on every
pull request. The preview must include the web archive, HTML email, plain-text
email, and their required assets. Prove the workflow with a real pull request
merged into `develop`, which is the current staging integration branch.

The stable GitHub check names are `Typecheck`, `Tests`, `Production build`, and
`Newsletter preview`. Once branch rules are available, require all four on
`develop` and `main` and require branches to be up to date before merging.

The gate is complete when all four checks pass on a real pull request, the
newsletter artifact can be downloaded and inspected, and that pull request is
merged. Enforcement remains incomplete while branch protection is unavailable.

## Phase 3 — Create staging on Railway

Create isolated web, newsletter API, and PostgreSQL services for staging. Apply
migrations through the documented path, use Railway-generated URLs, show draft
articles, and restrict newsletter recipients to an explicit test allowlist.

The gate is complete when the full platform can be reviewed safely without
production data, domains, or recipients.

## Phase 4 — Create production on Railway

Create separate production web, newsletter API, and PostgreSQL services. Keep
production data and secrets isolated from staging, deploy from `main`, hide
drafts, and validate health checks and rollback.

The gate is complete when the public site works on Railway-provided URLs and a
failed deployment can be detected and rolled back.

## Phase 5 — Formalize publication

Use one branch per article, review the pull-request artifact, review the full
change in staging, require approval before `main`, and run a smoke test after
publication.

The gate is complete when an article can follow the same documented path from
draft to verified production without testing directly in production.

## Phase 6 — Prove the newsletter in staging

Test signup and confirmation, invalid and duplicate tokens, bounces,
complaints, unsubscribes, signed webhooks, and issue reports. Keep delivery
restricted to test addresses.

The gate is complete when consent, suppression, delivery events, and reporting
have been demonstrated without a public audience.

## Phase 7 — Configure the `.com.br` domain

Register the selected domain, point web and API records, create a sending
subdomain, publish SPF, DKIM, and DMARC, and verify the domain in Resend.

The gate is complete when the site uses its own domain and the sending identity
is authenticated for real readers.

## Phase 8 — Open the newsletter

Configure the postal address and monitored contacts, create the production
segment, perform an internal send, inspect Gmail and another provider on mobile
and desktop plus plain text, and then enable the public form.

The gate is complete when readers can subscribe, confirm, receive, and leave the
newsletter safely.

## Phase 9 — Protect operations

Enable backups, prove PostgreSQL restoration, configure monitoring and alerts,
set cost limits, and document incident response.

The gate is complete when failures can be detected, contained, and recovered
without improvisation.

## Phase 10 — Prepare future visualizations

Set bundle and performance budgets, load interactive visuals only when needed,
move expensive calculations to Web Workers, define a fallback for weak devices,
and document the path toward remote training.

The gate is complete when new learning experiences have measurable performance
constraints and a graceful execution strategy across devices.
