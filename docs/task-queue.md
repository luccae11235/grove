# Grove task queue

This is the operational kanban for work that has not yet been completed. It is
the source of truth for current project tasks; the curriculum plan and roadmap
remain references for longer-term editorial direction.

## How to use this board

- Move a task left to right as it progresses: **Backlog** → **Ready** → **In
  progress** → **Done**.
- Keep **In progress** small: one active task per person whenever possible.
- Add a concise completion check to a task before moving it to **Ready**.
- Record a dependency or decision in the task itself. Move completed tasks to
  **Done** rather than deleting them, then periodically archive that section.

## In progress

### Release and platform readiness

- [ ] **Verify GitHub repository and deployment configuration**
  - Confirm repository visibility, default branch protection, required checks,
    Pages/deployment settings, and the GitHub Actions secrets/variables needed
    by the existing workflows.
  - Confirm that CI, Pages, newsletter preview/delivery, and project-export
    workflows have appropriate permissions and a documented release trigger.
  - Done when a pull request exercises the required checks and the deployment
    path is documented and tested.

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

### Release and platform readiness

- [ ] **Verify and complete Railway production configuration**
  - Validate the existing web and newsletter API service definitions in a real
    Railway project, including build context, health checks, domains, and
    environment variables.
  - Provision and connect the production PostgreSQL database; run migrations
    through the documented deployment path.
  - Done when both services deploy successfully from the intended branch and
    their public health checks pass.

- [ ] **Finalize public-release essentials**
  - Choose licenses for original writing, illustrations, and remaining workspace
    code; make the public notices consistent with the standalone project license.
  - Replace publication placeholders required for newsletter sending, including
    the postal address, and verify privacy/contact information.
  - Done when the repository and published site have complete, consistent legal
    and contact information.

## Backlog

### Content and learning experience

- [ ] **Publish the next curriculum articles**
  - Prioritize the next article from `docs/curriculum-plan.md`; create a task per
    article when it is ready to be scoped.

### Operations and quality

- [ ] **Set up production monitoring and operational alerts**
  - Choose monitoring for the web app, newsletter API, database, and scheduled
    delivery jobs; define owners and response steps for failures.

- [ ] **Establish backups and recovery procedures for newsletter data**
  - Document PostgreSQL backup retention, restore testing, and the recovery
    owner before collecting production subscribers.

- [ ] **Add an accessibility and responsive-design review pass**
  - Audit published routes and interactive visuals for keyboard access, screen
    reader semantics, contrast, reduced motion, and small-screen behavior.

- [ ] **Set up web analytics with consent-aware measurement**
  - Select a privacy-appropriate provider, document the events that matter, and
    verify consent and retention behavior against the privacy policy.

## Done

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
