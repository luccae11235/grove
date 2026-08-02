# Aflora

**Ideas, brought to life.**

Aflora is a personal collection of interactive articles built while learning. Each piece can combine plain-English explanations, from-scratch implementations, and visual experiments to make difficult ideas inspectable.

The library currently contains one article: **how can you reconstruct a classification decision tree from first principles?**

## What is available

- a responsive article library whose navigation is derived from published content;
- the first interactive decision-tree lesson;
- Gini and entropy implemented from first principles in Python;
- a real decision-stump trainer with a serializable training trace;
- a reusable visualization package connected directly to the model;
- focused unit tests for impurity and split selection.

## Project structure

```text
apps/web                         Astro site and localized lesson content
apps/web/src/content/articles    Typed publication metadata and MDX entries
apps/web/src/content/issues      Typed weekly issue content and delivery metadata
apps/newsletter-api              Double opt-in, Resend adapter, webhooks, reports
apps/observability-api           Consented readership events, anonymous feedback, retention, exports
packages/tree-core/grove         Canonical, from-scratch Python algorithms
packages/tree-core/tests         Python correctness tests
packages/tree-visuals            React/SVG views of Python-generated results
scripts/build_lesson_data.py     Bridge from Python execution to lesson artifacts
projects/manifest.json           Registry for standalone GitHub project mirrors
docs                             Product, architecture, roadmap, and decisions
```

## Run locally

Requirements: Python 3.9+, Node.js 22+, and pnpm.

```bash
pnpm install
pnpm dev
```

The local site runs at `http://localhost:4321` by default.

## Quality checks

```bash
pnpm run check
```

This runs type checks, algorithm tests, and the production build.

## Newsletter workflow

Draft issues render to a web archive, an email-safe HTML document, and a plain
text alternative from the same MDX source. Subscription delivery is disabled
until `PUBLIC_NEWSLETTER_API_URL` is configured.

```bash
pnpm newsletter:prepare
pnpm --filter @grove/newsletter-api test
```

Start with the [weekly publishing guide](docs/weekly-publishing.md). See the
[newsletter operating manual](docs/newsletter-operations.md) for Railway,
Resend, weekly publishing, delivery safeguards, and performance reporting.

Optional first-party readership measurement remains off unless the observability
service URL and explicit web build switch are configured. See the
[observability runbook](docs/observability-operations.md).

## Design principles

- **One source of truth:** the build runs the Python model; visuals consume its tree and trace, and lessons display an exact excerpt from the same file.
- **From scratch where it matters:** the Python machine-learning core uses only the standard library today and may use at most NumPy later.
- **Visual before ornamental:** an interaction must reveal a decision made by the model.
- **Published-only navigation:** the public library reflects what exists, not a speculative roadmap.
- **Learning graph:** stable article IDs connect prerequisites, automatic backlinks, and related paths without coupling references to URLs.
- **Static-first:** Python produces deterministic lesson artifacts at build time,
  keeping the published site portable while Railway serves the official
  staging and production environments.
- **English-first, translation-ready:** the first interface is English, with shared navigation and shell copy kept behind a locale boundary.

## Planning

- [Delivery phases and gates](docs/delivery-phases.md)
- [Operational task queue](docs/task-queue.md)
- [Curriculum plan](docs/curriculum-plan.md)
- [Article organization, references, and difficulty](docs/article-system.md)
- [Publication platform and newsletter boundaries](docs/publication-platform.md)
- [Newsletter setup, weekly operations, and performance](docs/newsletter-operations.md)
- [One-page weekly publishing guide](docs/weekly-publishing.md)
- [Database backup and recovery](docs/database-recovery.md)
- [Operations ownership and incident path](docs/operations-ownership.md)
- [Editorial release checklist](docs/editorial-release-checklist.md)
- [English and Brazilian Portuguese translation workflow](docs/content-translation-workflow.md)
- [Domain, DNS, and email-sending setup](docs/domain-dns-email-setup.md)
- [Product scope](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contribution workflow](CONTRIBUTING.md)
- [ADR 0001 — original browser-engine decision, superseded](docs/adr/0001-static-first-browser-engine.md)
- [ADR 0002 — Python as the canonical learning engine](docs/adr/0002-python-canonical-engine.md)
- [ADR 0003 — publication entities and typed content](docs/adr/0003-publication-content-boundaries.md)
- [ADR 0004 — consent, delivery, and telemetry](docs/adr/0004-consent-delivery-and-telemetry.md)

## Licensing

The standalone `grove-tree-core` project is licensed under MIT. Licensing for the
publication's original writing, illustrations, and remaining workspace code must
be finalized before the first public release.
