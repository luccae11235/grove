# Free static hosting implementation plan

> **For agentic workers:** use superpowers:executing-plans for inline execution. Owner requested planning, implementation and testing together.

**Goal:** Prepare Aflora for GitHub Pages Free, issue #240.
**Architecture:** Explicit static build profile, localized API-free reading experience, quality-gated Pages workflow. Keep legacy runtime code available for rollback.
**Tech stack:** Astro, React, pnpm, Python, Playwright, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-11-14-free-static-hosting-design.md

## Global constraints

- Preserve aflora.page article URLs and bilingual content.
- No runtime APIs, database, email sends or paid services in static deployment.
- Drafts excluded, even with inherited SHOW_DRAFTS=true.
- Production only through approved release PR to main; no DNS switch or deletion before verification.

## Review focus

Inherited enabled API variables; old confirmation tokens; repository subpath hosting; draft leakage; email artifacts containing postal information.

### Task 1: API-free build and reading experience

Files: apps/web/remark-base-path.mjs; apps/web/astro.config.mjs; scripts/operations/remark-base-path.test.mjs; scripts/operations/build-static.mjs; package.json; shared newsletter components; BaseLayout; both home, privacy and newsletter pages; apps/web/playwright.static.config.ts; apps/web/tests/static/hosting.spec.ts.

- [x] Write browser regression tests for no signup/API calls, retired legacy routes, metadata, locale navigation and working article lab controls.
- [x] Run against existing build and confirm failures come from email UI/legacy route behavior.
- [x] Implement explicit PUBLIC_STATIC_SITE profile forcing API switches off and drafts false, removing delivery-only artifacts and writing .nojekyll and revision metadata.
- [x] Add localized retirement/privacy components; guard legacy components and update home/header RSS calls to action.
- [x] Run static build, focused browser tests, unit checks and Astro types. Repeat build and browser checks with /grove base and github.io origin.

### Task 2: Deployment and migration operations

Files: .github/workflows/ci.yml; .github/workflows/deploy-pages.yml; .github/workflows/platform-smoke.yml; .github/workflows/newsletter-delivery.yml; .github/workflows/prepare-release.yml; docs/static-hosting-migration.md; README.md; .env.example; docs/task-queue.md.

- [x] Add static build/browser job and review artifact in CI.
- [x] Add Pages deployment triggered by successful main Quality checks, checking out that exact SHA. No PR/develop production deploy.
- [x] Keep legacy monitoring/delivery behind explicit transition opt-outs, document disabling them at cutover.
- [x] Document public exposure, free limits, Pages setup, DNS, backups, retirement and rollback.
- [ ] Review diff, run checks, commit with #240, push feature branch and open PR to develop with Closes #240.
- [ ] Wait for CI; review staging when available; report remaining production and provider access gates accurately.

## Execution record

- Task 1: implemented and locally verified; root and subpath static behavior passed.
- Review found missing article image/srcset bases and missing CI privacy contact;
  fixed with regressions. Initial DNS verification now explicitly waits for the
  DNS-live switch; superseded main runs cannot deploy.
- Whole-branch independent review completed; the author verified fixes.
- Public visibility exposes historical drafts/notes as documented. No real secret
  identified by Gitleaks across all 221 local commits; five test-fixture matches.
- Production release approval, remote staging authentication, DNS, backup and
  billing cancellation remain external cutover gates, tracked in issue #240.

- Remote CI exposed Portuguese hero text overflow with Linux fonts. Reproduced
  locally with Verdana at 320px (text right=334.25, box right=304); allowed long
  hero words to wrap without clipping. Regression checks four fonts at two widths.
