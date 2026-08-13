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

### Publishing and content

- [ ] **Draft the bagging variance article — issue #120**
  - Use one noisy sine-curve regression example and one fixed input to make
    pointwise model variance, bootstrap sampling, and averaging visible.
  - Two matched computed experiments show the single-tree and bagged-ensemble
    episodes; two restrained static visuals explain replacement and averaging.
  - Deterministic tests and desktop/mobile interaction coverage keep the episode
    calculations, 0.25×–10× playback, running means, adaptive aligned histograms,
    responsive layout, and math rendering honest.
  - Keep the article in draft through its pull request into `develop`; do not
    publish it before 2026-08-26 or couple it to this week's article release.
  - Reserve correlated trees, the variance floor, random-forest feature
    sampling, and boosting for later articles.
  - Completion check: the editorial draft and its accessible visual evidence
    pass the full repository gate and the exact revision is reviewed in staging.

- [ ] **Draft and test Issue 002 about classification and regression trees — issue #92**
  - Keep the newsletter issue in draft while reviewing its web, HTML email,
    and plain-text forms.
  - Publish both destination articles and the issue before creating the final
    provider send.
  - Review one Resend draft before the explicit, separately authorized send to
    the production segment.
  - Completion check: delivery events and the Issue 002 report confirm the
    three-person test audience received the intended broadcast without a
    duplicate send.

- [ ] **Align the launch article publication schedule — issue #95**
  - Publish the completed regression-tree article for launch week.
  - Return Reward Hacking to draft for next week's release and keep ACF/PACF
    in draft for the following week.
  - Do not create or send a newsletter broadcast as part of the website release.
  - Completion check: published-only staging and production expose exactly the
    two decision-tree articles, with exact-SHA deployment verification passing.

### Learning experience

- [x] **Add minimal anonymous article feedback — issue #96**
  - Let readers rate whether an article was useful without an account,
    newsletter subscription, or analytics consent.
  - Collect one optional structured reason and one bounded optional comment,
    with localized, accessible UI and safe retry/update behavior.
  - Store feedback in the existing environment-local observability database;
    add private reporting, retention, staging proof, and automated coverage.
  - Completion check: the full repository gate passes and the exact release is
    verified in staging before merge.
  - Completed 2026-08-02: the full gate passed and staging verification run
    `30751447055` passed for exact revision `f14a04c`, including the enabled
    feedback widget; the self-cleaning API/database proof passed all five checks.

- [ ] **Bound and simplify both decision-tree article visualizations — issue #91**
  - Keep classification and regression tables and playgrounds within the
    article content boundary at supported viewport widths.
  - Simplify oversized layouts so each primary learning state is complete,
    centered, and readable without horizontal clipping.
  - Preserve computed results, interactions, accessibility, and responsive
    behavior.
  - Completion check: focused checks and the full repository gate pass, and
    representative desktop, tablet, and mobile layouts are visually verified.

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

### Public release

- [ ] **Finalize public-release essentials**
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

## Done

### Learning experience

- [x] **Rebalance Article 2 regression-tree playgrounds — issue #104** — 2026-08-02
  - Kept Playground 2's prediction plot and growing tree side by side on desktop
    with continuous connectors between every visible parent and child.
  - Limited Playground 3's dataset to a compact scroll viewport with a sticky
    header while preserving access to all twelve rows.
  - Completion check: web typecheck and build passed; five focused browser tests
    and rendered desktop/mobile review confirmed legibility and containment.

- [x] **Standardize oversized ACF article playground widths — issue #81** — 2026-08-01
  - Constrained the sales-correlation and partial-correlation playgrounds to
    the same 720px desktop width as the inline synthetic-series playground.
  - Added desktop and mobile browser regression coverage while preserving
    responsive containment and keyboard interaction.
  - Completion check: the full repository gate passed; exact-SHA staging and
    production verification passed on `0b698dc` and `c6dab0e`, respectively.

- [x] **Animate released ramp cars through the highway merge — issue #80** — 2026-08-01
  - Released cars now remain visible while traversing the curved on-ramp into
    the highway during live training and learned-policy replay in both traffic
    playgrounds.
  - Preserved the traffic MDP, responsive layout, accessibility, and
    reduced-motion behavior while limiting live training to one legible batch.
  - Completion check: the full repository gate passed; exact-SHA staging and
    production verification passed on `8b2b127` and `891b7da`, respectively.

### Publishing and content

- [x] **Establish the weekly article publishing guideline — issue #121** — 2026-08-13
  - Separated draft intake into `develop`/staging from the Friday publication
    of exactly one queued article.
  - Made website promotion, provider-draft review, inbox testing, subscriber
    delivery, and reporting explicit checklist gates.
  - Preserved separate approval for production deployment and newsletter send.
  - Completion check: the short writer-facing guide matches the repository's
    real workflows, and the full local and GitHub checks passed.

- [x] **Translate the article library to Brazilian Portuguese — issue #112** — 2026-08-10
  - Added a complete Portuguese homepage and about page, plus reviewed `pt-BR`
    versions of both published articles while preserving their English counterparts.
  - Localized navigation, metadata, calls to action, article connections, static
    visuals, interactive examples, and consent copy; replaced literal “laço”
    translations with the natural technical term “loop”.
  - Completion check: the full repository gate passed; exact-SHA staging and
    production verification passed on `b21f0e8` and `b3d4514`, respectively.

- [x] **Prevent production articles from displaying a draft label — issue #78** — 2026-08-01
  - The production library now reads only the production-visible catalog.
  - Bespoke draft article routes resolve to noindex redirects outside a local or explicit draft preview.
  - Completion check: a production build excludes draft article cards and labels.

### Publishing and content

- [x] **Draft the ACF and PACF article — issue #76** — 2026-07-31
  - Completed the article from temporal correlation through ACF, PACF, and
    diagnostic interpretation using sourced datasets and correctly rendered math.
  - Added twelve static visuals and four guided interactions with accessible,
    responsive Aflora styling.
  - Passed editorial, mathematical-consistency, responsive, type, test, build,
    and rendered-browser review.

### Operations and quality

- [x] **Set up web analytics with consent-aware measurement** — 2026-07-28
  - Shipped isolated first-party observability services in staging and
    production, consented browser measurement, subscriber lifecycle history,
    reports and exports, immediate withdrawal deletion, and verified 400-day
    retention behavior.

### Learning experience

- [x] **Fix article navigation and split-preview discoverability** — 2026-07-24
  - Moved the fixed chapter panel below the site header so its close and reopen
    controls remain visible, clickable, and keyboard accessible.
  - Made the first split playground preview the nearest valid threshold as the
    pointer moves, while preserving drag behavior for touch and arrow controls.
  - Completion check: focused interaction checks, the full repository gate, and
    exact-SHA staging and production smoke tests pass.

### Product design

- [x] **Simplify article-card metadata and latest badge — issue #83** — 2026-08-01
  - Removed reading-time estimates and interactive counts from main-library
    article cards while preserving the underlying publishing metadata.
  - Placed the latest badge beside the newest article's publication date so all
    card titles share the same vertical alignment.
  - Completion check: focused web type, test, build, CI, and rendered browser
    checks passed at desktop and mobile widths.

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

- [x] **Finalize repository and publication licensing — issue #109** — 2026-08-10
  - Licensed original software under MIT and original articles, newsletter
    issues, and educational illustrations under CC BY 4.0, with explicit brand,
    external-data, and third-party-material exclusions.
  - Aligned repository files, package metadata, contribution guidance, the
    public licensing page, and the About page notice.
  - Completion check: the full repository gate and post-merge CI passed; staging
    verification run `31422533290` confirmed exact revision
    `8ab547a4424ca2732591436f49fe047cd73c6049`, and `/licensing/` plus its About
    page link were visually verified without layout or navigation defects.

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

- [x] **Complete the reward hacking article** — 2026-07-29
  - Replaced the staging draft with the editor-authored article and published
    its seven focused interactions.
  - Preserved the checkpoint playgrounds and added paired proxy/aligned
    learning playgrounds for the sensor and traffic examples.
  - Restored the traffic scene's fixed-speed highway flow, moving ramp queue,
    and paired 4-by-9 hold/release Q-value grids.
  - Completion check: the full repository gate passes, and a published-only
    Aflora build includes the indexed article, publication metadata, sitemap
    entry, and RSS entry.

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
