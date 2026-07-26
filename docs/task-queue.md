# Aflora task queue

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
| 1 | Organize GitHub | Done | Accepted owner-managed controls |
| 2 | Validate CI | Done | A repository and published branch |
| 3 | Create staging on Railway | Done | Phase 2 |
| 4 | Create production on Railway | Done | Phase 3 |
| 5 | Formalize publication | Done | Phases 2–4 |
| 6 | Prove the newsletter in staging | Done | Phase 3 |
| 7 | Configure the `aflora.page` domain | Done | Stable Railway services |
| 8 | Open the newsletter | In progress | Phases 6 and 7 |
| 9 | Protect operations | In progress | First encrypted local backup |
| 10 | Prepare future visualizations | Backlog | Current performance baseline |

## In progress

### Release and platform readiness

- [ ] **Phase 8 — Open the newsletter**
  - [x] Configure postal/contact details and the production segment.
  - [x] Publish Issue 001, perform an internal send, and verify its report.
  - [x] Review Gmail, mobile rendering, and plain text.
  - [x] Enable public double-opt-in signup; the platform smoke verifies an
    enabled form and public API audience.
  - [x] Close issue #49: make confirmation failures recoverable and add secure
    website subscription management.
    - [x] Preserve delivered confirmation links when a reader requests another.
    - [x] Allow provider failures to retry immediately and normal retries after
      a one-minute per-address cooldown.
    - [x] Add private status emails, expired-link recovery, and explicit
      website unsubscribe in English and Brazilian Portuguese.
    - [x] Cover the API, database migration, UI build, and deployment smoke
      boundaries with automated tests.
    - [x] Prove the complete flow in staging and promote the verified release to
      production. Staging inbox delivery and the exact-release smoke passed on
      `f2058f1`; production smoke passed all ten checks on `8d07633`.
  - [ ] Make signup and confirmation feedback immediate on a real iPhone.
  - [ ] Review a received issue in one non-Gmail mailbox provider.
  - Completion check: real readers can subscribe, confirm, receive, and
    unsubscribe safely.

- [ ] **Phase 9 — Protect operations**
  - [x] Run an exact-SHA production smoke after releases and every six hours.
  - [x] Open or update one actionable GitHub incident on failure and close it
    after recovery.
  - [x] Prove PostgreSQL restoration in an isolated non-production database and
    record the procedure in `database-recovery.md`.
  - [x] Verify the existing Railway $5 usage alert and $10 hard usage limit.
  - [x] Record operational ownership and the incident path.
  - [x] Approve encrypted local PostgreSQL backups as the current small-audience
    recovery policy.
  - [x] Create, checksum, and decrypt-verify the first encrypted local backup
    with `pnpm newsletter:backup`; the passphrase is stored in macOS Keychain.
  - Completion check: failures are detected and data can be restored through a
    tested procedure.

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

### Learning experience

- [x] **Fix article navigation and split-preview discoverability** — 2026-07-24
  - Moved the fixed chapter panel below the site header so its close and reopen
    controls remain visible, clickable, and keyboard accessible.
  - Made the first split playground preview the nearest valid threshold as the
    pointer moves, while preserving drag behavior for touch and arrow controls.
  - Completion check: focused interaction checks, the full repository gate, and
    exact-SHA staging and production smoke tests pass.

### Product design

- [x] **Rebrand Grove as Aflora — issue #6** — 2026-07-23
  - Preserved the existing green palette, editorial hierarchy, navigation, and
    professional visual density.
  - Replaced the branching mark with a compact sprout symbol and an editorial
    Aflora wordmark across the public interface, newsletter, RSS, metadata, and
    social sharing.
  - PR #7 passed the policy and quality checks before its squash merge into
    `develop`.
  - Completion check: Railway deployed the exact `develop` commit
    `26a27da8a5d30f00977421f4dbb9c98e3f375494` to staging; the platform smoke
    test, Aflora lockup, tagline, and social card checks passed without
    promoting to `main`.

### Release and platform readiness

- [x] **Phase 1 — Organize GitHub** — 2026-07-24
  - The repository, permanent branches, issue and pull-request policy checks,
    required quality checks, staging gate, production approval, and release
    back-merge path are operational.
  - Owner decision: paid private branch protection is unnecessary for this
    owner-managed project. Direct pushes remain procedurally prohibited but are
    an explicitly accepted risk.
  - Completion check: every shipped infrastructure change used the documented
    issue → branch → PR → CI → staging → production path.

- [x] **Phase 5 — Formalize publication** — 2026-07-24
  - Added a weekly article issue template, `weekly:new` and `weekly:check`
    shortcuts, and a one-page writer-facing guide.
  - Exercised CI, exact-SHA staging review, the automated release PR, explicit
    production approval, and exact-SHA production verification in PR #33.
  - Website publication remains separate from provider draft creation and the
    issue-scoped send or schedule confirmation.
  - Completion check: the documented path reached production without testing
    changes directly there and without sending a newsletter automatically.

- [x] **Harden exact-release CI/CD evidence** — 2026-07-24
  - Web and API expose non-sensitive release identity and deployment
    verification requires one SHA plus safe form, audience, CORS, and consent
    behavior.
  - Railway Wait for CI held staging and production deployments until the exact
    commit's GitHub quality checks passed.
  - Production release `876905a1aa7cc9b0830cccc0f0096f23709175b4`
    passed the automated exact-SHA verification in run `30125467901`.
  - Scheduled checks discover the matching deployed SHA, so documentation-only
    commits cannot create false incidents.
  - Completion check: reviewed commits wait for CI, deploy both services, retain
    explicit production approval, and produce exact-release evidence.

- [x] **Phase 7 — Configure the `aflora.page` domain** — 2026-07-24
  - Apex web, API, and sending domains use HTTPS; SPF, DKIM, and DMARC are
    configured, and Resend uses the authenticated sending domain.
  - Completion check: the site has its own address and authenticated sending.

- [x] **Phase 6 — Prove the newsletter in staging** — 2026-07-24
  - The allowlisted staging proof covered signup, confirmation, invalid and
    duplicate tokens, unsubscribe, bounce, complaint, suppression, signed
    webhooks, reports, and cleanup without a public audience.
  - Completion check: consent, suppression, events, and reporting work end to
    end with recipients restricted to controlled test addresses.

- [x] **Phase 4 — Create production on Railway** — 2026-07-24
  - Production web, API, PostgreSQL, Resend credentials, segment, webhook, and
    event salt are isolated from staging. Exact-SHA health and rollback were
    proven before public signup opened.
  - Completion check: the public platform works on Railway URLs and can recover
    from a failed application deployment.

- [x] **Phase 3 — Create staging on Railway** — 2026-07-22
  - Isolated web, API, and PostgreSQL services deploy from `develop`, show
    drafts, run migrations, and restrict newsletter recipients to an explicit
    allowlist.
  - Completion check: the complete platform is safely reviewable with staging
    data and recipients only.

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
