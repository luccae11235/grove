# Grove publication platform

Grove is an interactive publication. Its website is the canonical archive; email
will distribute dated issues that point readers back to durable articles and
projects.

## Content boundaries

| Entity | Owns | Does not own |
| --- | --- | --- |
| Article | Evergreen explanation, learning contract, canonical URL | Send date or subscriber delivery |
| Issue | Dated editorial message and featured article links | The canonical article body |
| Interactive | One learner question, controls, evidence, accessible fallback | Publication metadata |
| Project | Reproducible standalone code with its own tests and README | The article narrative |
| Series | A coherent learning path and ordering | Weekly publication cadence |

This separation allows an article to improve after its original email, an issue
to feature several articles, and a project to have releases independent of the
website.

## Implemented foundation

The Astro content collection is the canonical article catalog. Its schema checks
identity, locale, publication state, SEO copy, learning relationships, access
intent, and the pedagogical contract at build time.

The existing decision-tree lesson is protected by a transitional boundary:

- its English and Portuguese bodies remain unchanged in their `.astro` routes;
- corresponding MDX entries own their metadata;
- `implementation: legacy-astro` makes the transition explicit; and
- future articles should be authored directly in MDX.

The static build produces:

- canonical and alternate-language links;
- Open Graph and Twitter card metadata;
- a default 1200 × 630 social image;
- English and Portuguese RSS feeds;
- a sitemap and `robots.txt`; and
- published-only navigation and feeds, with drafts visible locally.

The weekly issue collection now produces a web archive, email-safe HTML, a plain
text alternative, and a machine-readable delivery manifest. Issue 001 is a draft
that references the preserved decision-tree article.

The newsletter API adds durable double opt-in, provider contact synchronization,
signed and idempotent webhook ingestion, suppression state, and per-issue reports.
Website deployment and email delivery remain deliberately separate. The full
setup and operating flow is in [newsletter-operations.md](newsletter-operations.md).

`SITE_URL` is required in production so canonical, sitemap, feed, and social URLs
use the public domain. `BASE_PATH` remains supported for GitHub Pages previews.

## Authoring flow

```text
Question → lesson brief → draft MDX → computed artifacts → preview → checks
         → publish website → test email → explicit send approval
```

Publishing the website and sending an email are intentionally separate actions.
No merge or deploy will send a newsletter automatically.

## Repository policy for companion projects

Projects begin under `projects/<project-id>` only when they can be self-contained.
Before a directory is mirrored to its own GitHub repository, it needs:

- an independent README and license;
- standalone install, test, and build commands;
- no dependency on private workspace-only packages; and
- a stable link back to the canonical Grove article.

The Grove monorepo should remain the source of truth initially. Separate GitHub
repositories are publish-only mirrors produced from directory history. If a
project later becomes contributor-led, its repository ownership policy can be
revisited explicitly rather than introducing submodules by default.

## Phase status

1. Publication foundation: implemented.
2. Newsletter subscription and issue rendering: implemented locally; requires
   Railway, PostgreSQL, Resend, a sender domain, and a real postal address to go
   live.
3. Controlled delivery and performance reporting: implemented and tested with
   adapters; production integration requires credentials and an internal send.
4. Project distribution: the first Python project is standalone-ready, with a
   registry, clean export, tests, and an explicit non-force publishing command.
5. Accounts, billing, paywalls, and entitlements: intentionally deferred until
   readership and retention demonstrate demand.
