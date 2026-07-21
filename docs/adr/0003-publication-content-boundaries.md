# ADR 0003 — Separate publication entities and adopt typed article content

- Status: accepted
- Date: 2026-07-18

## Context

Grove began as one interactive decision-tree lesson. It now needs to support a
weekly publication, multiple technical contexts, localized articles, newsletter
issues, and selected standalone GitHub projects without coupling all of those
lifecycles.

The existing article catalog was a handwritten TypeScript array, while both full
lesson bodies lived directly in route files. This worked for one article but did
not validate publication dates, drafts, SEO data, or pedagogical outcomes.

## Decision

Grove distinguishes Article, Issue, Interactive, Project, and Series as separate
entities. Astro Content Collections own article metadata and validate it at build
time. MDX is the default authoring format for future articles because it combines
long-form content with interactive components.

The existing English and Portuguese decision-tree bodies will not be rewritten in
this migration. Their MDX collection records use `implementation: legacy-astro`,
and their current routes keep rendering the protected bodies. Metadata consumed
by those routes comes from the collection.

The static site remains the deployment artifact in Phase 1. RSS, sitemap, social
metadata, and canonical URLs are generated at build time. Drafts are excluded from
production discovery surfaces.

## Consequences

- Article metadata has one validated source of truth.
- Future articles can be written in MDX without growing bespoke route files.
- The current lesson experiences no high-risk body conversion.
- Publication and future email delivery remain separate operations.
- A later migration must move the protected lesson body into MDX deliberately;
  the explicit implementation field prevents that debt from becoming invisible.
- Production builds must provide `SITE_URL` for correct absolute URLs.
