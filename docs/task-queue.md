# Grove task queue

This is the source of truth for unfinished operational, product, content, and
release work. The ordered release gates are explained in
[`delivery-phases.md`](delivery-phases.md); the curriculum plan and roadmap are
references for longer-term editorial direction.

## How to use this board

- Move work through **Backlog** → **Ready** → **In progress** → **Done**.
- Use **Blocked** only when an external decision or capability prevents the next
  action, and record the exact unblock condition.
- Keep **In progress** to one active card per person whenever possible.
- Do not begin a later delivery phase merely because preparation for it exists.
- Update the relevant phase checklist and completion check whenever its state
  changes; move completed cards to **Done** rather than deleting them.

## Delivery gate status

| Phase | Gate | Status | Depends on |
| --- | --- | --- | --- |
| 1 | Organize GitHub | Blocked | GitHub branch-protection capability |
| 2 | Validate CI | Done | A repository and published branch |
| 3 | Create staging on Railway | Backlog | Phase 2 |
| 4 | Create production on Railway | Backlog | Phase 3 |
| 5 | Formalize publication | Backlog | Phases 2–4 |
| 6 | Prove the newsletter in staging | Backlog | Phase 3 |
| 7 | Configure the `aflora.page` domain | Backlog | Stable Railway services |
| 8 | Open the newsletter | Backlog | Phases 6 and 7 |
| 9 | Protect operations | Backlog | Production services; before public data |
| 10 | Prepare future visualizations | Backlog | Current performance baseline |

## Blocked

### Release and platform readiness

- [ ] **Phase 1 — Organize GitHub**
  - [x] Create the official private repository at `luccae11235/grove`.
  - [x] Version and publish the current work and permanent branches.
  - [x] Complete the first pull-request merge through Phase 2 validation PR #1.
  - [ ] Protect `main` and require reviewed, up-to-date checks.
  - Blocker: GitHub returns HTTP 403 because branch protection for this private
    repository requires GitHub Pro or making the repository public.
  - Completion check: `main` rejects direct, unreviewed changes and records a
    successful pull-request merge.

## Ready

### Publishing and content

- [ ] **Complete the reward hacking article**
  - Finish the editorial pass and integrate the companion lab where it supports
    a specific learning objective.
  - Done when the English article is complete, reviewed in the site, and ready
    to be published.

### Localization

- [ ] **Translate the article library to Brazilian Portuguese**
  - Inventory every publishable English article, issue, and supporting UI string
    before translating.
  - Preserve interactive examples, metadata, routes, links, and the English
    original as the source counterpart for each translation.
  - Done when every published article has a reviewed `pt-BR` version and locale
    switching works for all published pages.

### Public release

- [ ] **Finalize public-release essentials**
  - Choose licenses for original writing, illustrations, and remaining workspace
    code; make the public notices consistent with the standalone project license.
  - Replace publication placeholders required for newsletter sending, including
    the postal address, and verify privacy/contact information.
  - Done when the repository and published site have complete, consistent legal
    and contact information.

## Backlog

### Delivery phases

- [ ] **Phase 3 — Create staging on Railway**
  - Create isolated web, newsletter API, and PostgreSQL services using
    Railway-generated URLs; configure variables and run migrations.
  - Show draft articles and restrict all newsletter delivery to an explicit test
    allowlist.
  - Completion check: the complete platform is safely reviewable with staging
    data and recipients only.

- [ ] **Phase 4 — Create production on Railway**
  - Create production web, newsletter API, and PostgreSQL services connected to
    `main`, with secrets and data isolated from staging.
  - Keep drafts hidden and verify public health checks and rollback.
  - Completion check: the public platform works on Railway URLs and can recover
    from a failed deployment.

- [ ] **Phase 5 — Formalize publication**
  - Use a branch per article, PR artifact review, staging review, approval before
    `main`, and a post-publication smoke test.
  - Completion check: an article follows a repeatable documented path without
    being tested directly in production.

- [ ] **Phase 6 — Prove the newsletter in staging**
  - Test signup, confirmation, invalid and duplicate tokens, bounce, complaint,
    unsubscribe, signed webhooks, and reports.
  - Keep recipients limited to test addresses.
  - Completion check: consent, suppression, events, and reporting work end to end
    without a public audience.

- [ ] **Phase 7 — Configure the `aflora.page` domain**
  - Register the selected domain; point web and API; create the sending subdomain;
    configure SPF, DKIM, and DMARC; verify the domain in Resend.
  - Completion check: the site has its own address and authenticated sending.

- [ ] **Phase 8 — Open the newsletter**
  - Configure postal/contact details and the production segment; perform an
    internal send; review Gmail, another provider, mobile, and plain text.
  - Enable the public form only after those checks pass.
  - Completion check: real readers can subscribe, confirm, receive, and
    unsubscribe safely.

- [ ] **Phase 9 — Protect operations**
  - Enable backups and prove PostgreSQL restoration; configure monitoring,
    alerts, cost limits, ownership, and incident response.
  - Completion check: failures are detected and data can be restored through a
    tested procedure.

- [ ] **Phase 10 — Prepare future visualizations**
  - Define bundle and performance budgets, lazy loading, Web Worker boundaries,
    weak-device fallbacks, and the evolution toward remote training.
  - Completion check: new visuals have measurable budgets and graceful execution
    paths across devices.

### Content and learning experience

- [ ] **Publish the next curriculum articles**
  - Prioritize the next article from `docs/curriculum-plan.md`; create a task per
    article when it is ready to be scoped.

### Operations and quality

- [ ] **Add an accessibility and responsive-design review pass**
  - Audit published routes and interactive visuals for keyboard access, screen
    reader semantics, contrast, reduced motion, and small-screen behavior.

- [ ] **Set up web analytics with consent-aware measurement**
  - Select a privacy-appropriate provider, document the events that matter, and
    verify consent and retention behavior against the privacy policy.

## Done

### Release and platform readiness

- [x] **Formalize and prove the required GitFlow — issue #4** — 2026-07-23
  - Opened the issue with the workflow and acceptance criteria before editing.
  - Created `chore/issue-4-formalize-gitflow` from the latest `develop`.
  - Added issue and PR templates plus automated branch, issue-link, and
    production-approval checks.
  - Removed the legacy GitHub Pages deployment and aligned operational docs
    with Railway and private GitHub Free.
  - PR #5 passed the policy and quality checks before merging into `develop`.
  - Completion check: the governance change itself completed the documented
    issue → branch → PR → CI → `develop` sequence.

- [x] **Phase 2 — Validate CI** — 2026-07-21
  - Tests, type checking, standalone-project validation, the production build,
    and newsletter artifact validation pass locally and in GitHub Actions.
  - Every pull request runs stable `Typecheck`, `Tests`, `Production build`, and
    `Newsletter preview` checks.
  - PR #1 produced and exercised the downloadable `newsletter-preview` artifact,
    including the draft web issue, HTML email, plain-text email, manifest, and
    assets, before merging into `develop`.
  - Completion check: PR #1 passed all four checks, its artifact was inspected,
    and it was merged. Automatic enforcement still depends on resolving the
    Phase 1 branch-protection blocker.

### Editorial operations

- [x] **Create an editorial release checklist** — 2026-07-20
  - Added a reusable gate covering technical and pedagogical review, visual
    simplicity, accessibility, responsive behavior, metadata, links,
    localization, preview, publication, and post-deploy verification.
  - Completion check: the checklist maps each requested concern to an explicit
    reviewer action and uses the repository's actual build and preview commands.

- [x] **Define a content translation workflow** — 2026-07-20
  - Documented English-source and Brazilian Portuguese counterpart ownership,
    inventory, translation, review, and update-parity rules.
  - Completion check: the workflow identifies the concrete source locations,
    invariants, review gates, and handling for meaningful source changes.

### Operations and quality

- [x] **Document domain, DNS, and email-sending setup** — 2026-07-20
  - Added an ownership record, Railway custom-domain flow, Resend authentication
    flow, GitHub environment notes, launch checks, and a quarterly review cadence.
  - Completion check: the runbook connects the committed service configuration
    and environment variables to a reproducible production setup without storing
    provider-specific secrets in the repository.

### Publishing and content

- [x] **Fix the home library catalog source** — 2026-07-21
  - The shelf now uses the complete authored English catalog instead of the
    published-only feed, with unfinished articles labeled as drafts.
  - Completion check: all three authored articles appear in the production
    output, and the build and Astro typecheck pass.

- [x] **Refine article discovery and center the reading experience** — 2026-07-21
  - Replaced the oversized featured card and track previews with a compact,
    horizontally scrollable shelf containing every published article.
  - Kept article prose left-aligned for readability while centering the reading
    column, figures, and interactive playgrounds in the available page width.
  - Completion check: track navigation is removed and the production build and
    Astro typecheck pass.

- [x] **Build the Grove home page and article discovery experience** — 2026-07-20
  - The root page introduces Grove and provides a dedicated article-discovery
    surface that can grow with the publication.
  - Global navigation now uses a responsive top bar; article pages have no
    persistent left sidebar and retain an optional chapter index on the right.
  - Completion check: production build and Astro typecheck pass.
