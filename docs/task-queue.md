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

## Editorial tooling — requested 2026-11-15

- [ ] **Create and test the Aflora article structure skill — issue #245** — In progress
  - [x] Create the discoverable repository-local skill with validated metadata.
  - [x] Complete topic, learning scope and bracketed structures from partial material,
    preserving the editor's order and scope and separating proposed corrections.
  - [x] Review fresh-context trials with the supplied data-systems outline, a topic
    only, and a nearly complete plan. Preserve the original excerpt and save the
    [proposed preparation](article-plans/data-systems-trade-offs.md).
  - [x] Run `pnpm check` successfully; seven database-dependent integration tests
    skip without a configured test database.
  - [x] Complete an initial independent review; it checked format and preservation
    but did not catch the narrative weaknesses later identified by the editor.
  - [x] Rebuild the skill around researched storytelling and visual explanation,
    with focused parallel research and synthesis; repeat the original and cache trials.
  - [x] Review the new proposal with three independent simulated readers and edit
    conceptual bridges, scope and visual development from their specific findings.
    These hypotheses do not replace the editor's judgment or real reader research.
  - [x] Validate the revised skill and rerun `pnpm check`; original input and rejected
    first trial are preserved separately.
  - [x] Integrate only the editor's supplied writing style into structure preparation,
    including fluid titles and near-elimination of rhetorical colon/dash separators.
    Keep placeholder syntax and the prose-writing skill outside this amendment.
  - [x] Apply the style to the data-systems preparation, including headings and
    conceptual instructions; verify unchanged visual placeholders and source links.
  - PR: [#246](https://github.com/luccae11235/grove/pull/246), against `develop`.
    The editor rejected the initial narrative on 2026-11-15. The researched revision
    and new preparation are ready for editorial review; remote quality gates remain
    before merge. Article approval is separate.
  - Keep the prose-writing skill and article publication outside this task.
  - Completion check: metadata validates, behavioral trials are reviewed, the example
    is available for editorial review, and an issue-linked PR passes repository gates.

- [ ] **Create and test the Aflora article drafting skill — issue #247** — In progress
  - [x] Create `aflora-article-draft` from the supplied drafting prompt and writing
    style, with validated discoverable metadata and a self-contained contract.
  - [x] Preserve approved scope, headings, explanatory progression and literal
    visual placeholders; separate writing from planning, visual implementation
    and publication. Document invocation after structure approval.
  - [x] Review independent drafting trials and check approval, language, evidence,
    calculations, narrative continuity and placeholder preservation.
  - [x] Complete an independent contract review against the supplied prompt and
    writing style; no consequential omission was identified.
  - [x] Open [PR #248](https://github.com/luccae11235/grove/pull/248) against
    `develop`; local authoring and behavioral validation are complete.
  - [ ] Pass remote repository gates before integration; no merge was performed.
  - Depends on the structure tooling in PR #246; no article approval is implied.
  - Completion check: the skill validates, behavioral trials are reviewed, and
    the issue-linked PR passes applicable repository gates before integration.

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
| 8 | Open the newsletter | Retired by #240 | Static RSS publication |
| 9 | Protect operations | Done for static retirement | Verified encrypted backups and live Pages probe |
| 10 | Prepare future visualizations | Backlog | Current performance baseline |

## In progress

### Publishing and content

- [ ] **Publish the categorical-feature article — issue #235**
  - [x] Review the current English text, ten-record numerical examples,
    23 method figures, overview, and three playgrounds from PR #234.
  - [x] Prepare only `categorical-features` for publication on 2026-10-31;
    preserve unrelated drafts and newsletter issues.
  - [x] Pass `pnpm check`, 19 numerical tests, five browser tests, and
    desktop/mobile review; verify the published-only metadata, assets, catalog,
    RSS, sitemap, unchanged article body, and exclusion of unrelated drafts.
  - [ ] Review the exact staging revision after the publication PR is approved.
  - [ ] Obtain explicit release approval and verify the production revision
    and canonical article route.
  - Completion check: the published-only catalog, RSS, sitemap, metadata,
    assets, and desktop/mobile interactions pass on the exact production SHA.
    Newsletter delivery and LinkedIn posting are outside this release.

- [ ] **Publish the Markov principle in English and Brazilian Portuguese and deliver Issue 009 — issue #221**
  - Publish only the reviewed Markov article pair and the short bilingual-link announcement dated 2026-10-09.
  - Verify exact staging and production revisions, both article routes, locale links, and newsletter artifacts.
  - Use the controlled owner-only delivery workflow once, then record accepted sends and observed delivery separately.
  - Completion check: production routes and the Issue 009 delivery report are verified without exposing the regression-tree extrapolation draft.

- [ ] **Publish bilingual model evaluation and prepare owner-only Issue 008 test — issue #214**
  - Review both article locales, calculations, links, interactions, and email previews.
  - Publish only the selected article and Issue 008 after staging and production gates.
  - Send a test email only to the owner; subscriber delivery requires separate approval.
  - Completion check: exact-SHA production verification and canonical routes pass;
    the Issue 008 test reaches the owner without a subscriber send or schedule.

- [ ] **Explain why constant-leaf regression trees do not extrapolate — issue #209**
  - [x] Record the learning scope, complete English editorial draft, visual contract,
    and unsent email/LinkedIn drafts in `docs/article-plans/`.
  - [x] Add matched English and Brazilian Portuguese article drafts and one
    focused interactive example; keep both articles in `draft`.
  - [x] Complete focused tests, full repository checks, and desktop/mobile
    rendered review before requesting staging review.
  - Completion check: the approved reader-facing drafts and interaction pass
    all checks, with publication and newsletter delivery remaining separate.

- [ ] **Develop the Markov principle article — issue #158**
  - [x] Add the complete supplied English manuscript with the title, chapter
    structure, formulas, and production notes on an isolated docs branch.
  - [x] Replace the image and playground notes iteratively after the text
    structure has been reviewed.
    - [x] Add the opening comparison showing when history changes the predicted
      transition and when the current state makes history irrelevant.
    - [x] Refactor the opening history comparison into a concrete previous-frame
      example with plain state labels; verify desktop and mobile rendering.
    - [x] Build the Pong learning experience — issue #161.
      - [x] Add the environment and state-representation figures.
      - [x] Implement two matched playable Pong environments and paired Q-learning
        experiments that differ only in state representation, with real,
        reproducible evaluation curves.
      - [x] Complete focused tests and rendered desktop/mobile review.
      - [x] Simplify both playgrounds to the state, training court, learning
        result, and an episodes-per-second speed control.
      - [x] Vary training launches and let readers run each trained agent with
        a live hit/miss count while keeping the paddle agent-controlled.
      - [x] Preserve rally continuity after a hit, make miss resets explicit and
        non-animated, and anchor the velocity vector to the ball in every
        direction.
    - [x] Build the door-and-key learning experience with a minimal route figure,
      an aliased-state comparison, and matched position-only and key-aware
      Q-learning playgrounds with runnable learned policies.
    - [x] Build the ordered-checkpoint learning experience with a minimal hub
      figure, a same-movement/different-reward comparison, and matched
      position-only and progress-aware Q-learning playgrounds with runnable
      learned policies.
    - [x] Add the final synthesis figure aligning missing dynamics, missing
      memory, and missing reward state with their minimal state repairs.
    - [x] Apply beta-reader revisions: distinguish complete state from the
      learner's representation, keep rollout caps outside the MDP, add
      prediction and transfer checks, and align claims with computed results.
    - [x] Make all three training simulations visibly rapid and responsive to
      their episodes-per-second controls while preserving normal-speed policy
      playback after training.
    - [x] Design and implement the remaining image and playground notes.
  - Keep the article in draft; translation, publication, deployment, merge,
    and newsletter delivery remain out of scope until separately reviewed.
  - Completion check: the complete learning experience passes focused checks
    and rendered desktop/mobile review before staging review and merge.
- [ ] **Publish Reward Hacking and deliver Issue 003 — issue #129**
  - Publish the reviewed English and Brazilian Portuguese article on 2026-08-14
    while keeping Bagging and ACF/PACF in draft.
  - Review the short Issue 003 web, HTML email, and plain-text forms before the
    production promotion.
  - Treat the production merge, provider draft, test email, and subscriber send
    as separate gates with explicit approval for production and delivery.
  - Completion check: exact-SHA staging and production verification pass, the
    test email is approved, and the Issue 003 report confirms delivery without
    a duplicate send.

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

- [ ] **Prepare the Reward Hacking article for release — issue #123**
  - Make the first checkpoint playground clearly explain that readers can move
    checkpoints and watch the model learn the changed route.
  - Add and review the complete Brazilian Portuguese article on the same
    isolated branch before release.
  - Keep production deploys, merges, and newsletter delivery out of scope until
    separately reviewed and authorized.
  - Completion check: focused checks and desktop/mobile rendered review pass,
    followed by staging review of the complete English and Portuguese article.

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

## Backlog

### Delivery phases

- [ ] **Phase 10 — Prepare future visualizations**
  - Define bundle and performance budgets, lazy loading, Web Worker boundaries,
    weak-device fallbacks, and the evolution toward remote training.
  - Completion check: new visuals have measurable budgets and graceful execution
    paths across devices.

### Content and learning experience

- [ ] **Translate the categorical-feature article into Brazilian Portuguese — follow-up to #235**
  - The 2026-10-31 publication contains only the reviewed English article.
    Prepare and review a matched translation separately, preserving the examples,
    label-separation rules, figures, interactions, and immutable article ID.
  - Completion check: a separately approved Portuguese article, locale links,
    metadata, and desktop/mobile interactions pass the release workflow.

- [ ] **Publish the next curriculum articles**
  - Prioritize the next article from `docs/curriculum-plan.md`; create a task per
    article when it is ready to be scoped.

### Operations and quality

- [ ] **Add an accessibility and responsive-design review pass**
  - Audit published routes and interactive visuals for keyboard access, screen
    reader semantics, contrast, reduced motion, and small-screen behavior.

## Done

### Static public-release readiness — 2026-11-15

- [x] **Replace newsletter-only release essentials with static publication requirements**
  - Sender postal details and other newsletter sending placeholders are
    superseded by #240; email delivery is retired.
  - Both static privacy pages expose the configured public historical-data
    contact, and existing licensing links remain valid. These were verified
    against the public HTTPS site; this records product checks, not a new legal review.
  - Completion check: no retired email requirement blocks static publication;
    the site's public privacy contact and licensing links are verified.

### Static hosting retirement — 2026-11-15

- [x] **Move Aflora to GitHub Pages Free and retire Railway** — issue [#240](https://github.com/luccae11235/grove/issues/240).
  - Public repository and API-free static publication at `https://aflora.page`;
    RSS replaces email signup and old subscription URLs explain retirement.
  - Feature PR #241 and owner-approved release #243 merged. All seven quality
    jobs passed; Pages run `43628322160`, attempt 3, passed the live exact-SHA probe.
    Production: `d8009c63579a08b9bfa643a684f0e9f099156e6b`, `mode=static`.
  - Namecheap apex and `www` now point to GitHub Pages. Both names have valid
    TLS, HTTPS enforcement is on, and the old API/Railway DNS records are removed.
    Mail records were preserved.
  - Six remote browser scenarios passed on production, with desktop/mobile visual
    review, both locales, labs, images, RSS, archives, retirement links and sharing
    metadata. The historical privacy contact matches the configured address.
  - Production/staging database archives were encrypted and fully restored;
    all 15 tables matched, including a final source comparison before deletion.
    The detached historical volume was also archived and hash-verified.
    Backups and recovery instructions are in the owner's private backup folder.
  - Retired both Resend webhooks and both application keys; contacts and sent
    history remain. Removed six obsolete repository secrets and the temporary SSH
    backup identity. No email was sent or scheduled.
  - Railway accepted deletion of both Aflora environments, services and volumes;
    permanent deletion is scheduled for 2026-11-17. The shared Hobby subscription
    is already cancelled, with the current period ending 2026-11-21. Historical
    usage may still appear on the final invoice. No renewal was requested.
  - The owner also authorized retirement of the other shared-workspace project:
    its database backups passed full restoration; inaccessible object files and
    historical object backups were explicitly authorized for disposal without copy.
  - Runbook: [static hosting migration](static-hosting-migration.md).
  - Completion check: reviewed staging, green checks, approved production release,
    public exact-SHA HTTPS verification, recoverable backups, provider retirement
    accepted and subscription cancellation verified.

### Historical runtime retirement

- [x] **Retire the Phase 8 newsletter platform** — 2026-11-15
  - Superseded by #240. The checklist below is historical; its unfinished email
    improvements were not implemented or authorized for delivery by this migration.
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
  - [x] Separate transactional confirmation reputation from broadcasts — issue #152.
    - [x] Add a dedicated, verified transactional sending subdomain and keep
      tracking disabled for confirmation and subscription-management mail.
    - [x] Verify a real received confirmation passes SPF, DKIM, and DMARC and
      review its placement before enabling the new identity in production.
    - Completed 2026-08-21: `confirm.aflora.page` was verified in Resend with
      dedicated DKIM, SPF, return-path MX, and monitored DMARC. Exact staging
      revision `24ba23f7bd8f87a2960b4dad16d1064ee5135fe3` sent untracked
      transactional messages that Gmail authenticated and placed in Personal.
  - [ ] Require explicit reader action before confirmation — issue #154.
    - In progress: add an explicit POST confirmation, scanner regression tests,
      and a manual, audited expired-link reminder pipeline for the three
      owner-selected pending recipients. Production release and recipient delivery
      remain separate completion gates.
    - A staging proof subscriber changed from pending to active 18 seconds after
      delivery without an intentional link click; replace the confirmation
      page's automatic redirect with an explicit, scanner-safe action.
  - Completion check: real readers can subscribe, confirm, receive, and
    unsubscribe safely.

- [x] **Phase 9 — Protect operations** — static retirement completed 2026-11-15
  - The final database archives passed full restoration; Pages now checks the
    exact public SHA after deployment. The prior runtime checklist below is historical.
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


### Publishing and content

- [x] **Make the categorical-feature article easier to read — issue #233** — 2026-10-31
  - Preserved the section sequence, ten-record example, 23 method figures and
    three compact playgrounds; rewrote the article in plain English, removed
    formulas and unnecessary split-score arithmetic, and used concrete examples
    for smoothing, shared evidence, and label exclusion.
  - Matched the introduction's single four-family list to the overview labels;
    added X/y-to-encoded-X diagrams, consistent category-to-vector figures,
    and a small native category-grouping tree.
  - Completion check: `pnpm check`, 19 focused numerical tests, final typecheck
    and draft build, five Chromium tests, desktop/mobile visual review, and
    SVG text-bound checks passed. Preview and PR #234 updated for editorial review.

- [x] **Apply the categorical-feature beta-reader revisions — issue #233** — 2026-10-29
  - Preserved section order, all 23 method figures, and the three compact
    playgrounds; clarified LOO's inverted training cue and a conservative frozen
    supervised-encoder workflow with its data-efficiency tradeoff.
  - Moved the three-decision map earlier, placed specialized James–Stein, GLMM,
    and LightGBM mathematics in optional disclosures, added OOF reference IDs to
    the existing legend, and added a closing transfer question with a hidden answer.
  - Completion check: 19 focused numerical tests, five Chromium acceptance tests,
    workspace typecheck, draft build, desktop/mobile visual review, and whitespace
    checks passed. The refreshed preview and existing PR #234 contain the revisions.

- [x] **Simplify the categorical-feature visuals after editorial review — issue #233** — 2026-10-29
  - Preserved the prose and added 23 focused, accessible SVG figures alongside
    the method sections, including paired variants within their shared figures.
  - Replaced the dense dashboards with three compact family-end translation
    playgrounds: one selector and category-to-representation outputs. Native tree
    mechanisms are explained in their local figures; repeated source tables,
    decision results, arithmetic panels, and secondary controls were removed.
  - Completion check: `pnpm check`, 19 focused numerical/translation tests, four
    browser acceptance tests, desktop/mobile visual review, and SVG text-bound
    checks passed. The updated draft preview is ready for editorial judgment.

- [x] **Rewrite the categorical-feature learning experience — issue #233** — 2026-10-29
  - Replaced the earlier PR #227 proposal with the four-family manuscript from
    PR #232, retaining the `categorical-features` draft identity and route.
  - Implemented a native overview figure and four accessible, responsive method
    playgrounds sharing the fictitious ten-record seed dataset; schematic vectors
    and library snapshots are explicitly distinguished from fitted results.
  - Completion check: `pnpm check`, final typecheck, 16 focused numerical tests,
    five Chromium acceptance tests, published/draft builds, and desktop/mobile
    visual review passed. The public route, catalog, RSS, and sitemap exclude
    this draft. A local rendered preview is available for editorial judgment;
    merge, staging deployment, publication, and delivery remain separate steps.

- [x] **Translate the Markov principle article into Brazilian Portuguese — issue #207** — 2026-09-30
  - Added a faithful `pt-BR` draft with aligned learning metadata, structure,
    equations, figures, and all six interactive experiences.
  - Localized reader-facing and accessible text in the shared figures and labs.
  - Completion check: repository quality gates passed; both locales received
    desktop and mobile rendered review; the pull request revision was reviewed
    on staging before merging to `develop`.

- [x] **Publish Beyond CART — issue #202** — 2026-09-18
  - Published the reviewed English article through implementation PR #204 and
    production release PR #205; exact staging revision `e8211c1` and production
    revision `46a18e6` passed deployment verification in runs `35379494138` and
    `35380532188`, respectively.
  - Verified the canonical article, latest-library position, RSS, sitemap,
    desktop/mobile containment, and continued production exclusion of the
    Markov principle and model-evaluation drafts.
  - Recorded Brazilian Portuguese translation parity under issue #203. No
    provider draft, newsletter broadcast, or schedule was created.

- [x] **Correct and simplify the Beyond CART learning experience — issue #199** — 2026-09-16
  - Corrected the soft-routing limit, oblique-tree comparison, split geometry,
    optimization language, and architecture terminology from the beta-reader
    review while reducing repeated synthesis.
  - Made the builder explicit about its fixed illustrative models, added guided
    one-axis comparisons and a prediction scale, and strengthened the model-leaf
    and threshold-crossing visuals.
  - PR #200 passed the full GitHub gate; focused browser acceptance passed at
    desktop and mobile widths, and Railway staging reviewed exact PR revision
    `aa2bfee` before merge and exact `develop` revision `549ef7a` afterward.
  - The article remained a draft at completion; publication is tracked
    separately under issue #202 and translation parity under issue #203.

- [x] **Draft Beyond CART: Decision Trees Don't Have to Look Like CART — issue #191** — 2026-09-11
  - Added the complete supplied English manuscript, formulas, metadata, and
    planned section sequence as an unpublished MDX article.
  - Kept translation, publication, deployment, and newsletter delivery outside
    the writing scope.
  - Completion check: the full prose is present and its content, typecheck, and
    draft-build checks pass.

- [x] **Publish Gradient Boosting and deliver Issue 007 — issue #193** — 2026-09-11
  - Published the reviewed English and Brazilian Portuguese article through PR
    #194 and release PR #190.
  - Verified staging revision `a59e14d` in run `34603685935` and production
    revision `08fc680` in run `34605041981`, including both article locales and
    all Issue 007 forms.
  - Reviewed broadcast `c522d9dc-92cb-4ed9-9568-7a6c40c06400`, confirmed the
    owner test in Primary, and sent it once through run `34605651239`.
  - The first report recorded 9 sent, 9 delivered, 0 bounced, 0 complained, and
    0 suppressed.

- [x] **Publish and deliver Issue 006 about bagging variance — issue #182** — 2026-09-04
  - Published the reviewed text-only issue through implementation PR #186 and
    release PR #187; exact staging revision `cde06c6` and production revision
    `9368938` passed deployment verification.
  - Verified the public issue, HTML email, plain-text email, and article routes;
    the production email artifact contains no image tags.
  - Created Resend broadcast `42d40431-33e8-42e5-885f-ed99f8008ba5`, sent the
    owner test, and delivered it once to the production audience only after the
    owner supplied the exact `SEND:2026-006` confirmation.

- [x] **Publish How Bagging Removes Variance — issue #180** — 2026-09-04
  - Published only the reviewed English `bagging-reduces-tree-variance` article
    through implementation PR #183 and production release PR #184.
  - Full checks passed; exact staging revision `bf35fa4` and production revision
    `4e3d97a` passed deployment verification in runs `33870316442` and
    `33871040497`, respectively.
  - Verified the canonical article, latest-library position, RSS, sitemap,
    desktop/mobile layout, and continued exclusion of the two later drafts.
  - Recorded Brazilian Portuguese translation parity under issue #181 and the
    separate Issue 006 email draft/test work under issue #182; no provider
    broadcast was created, sent, or scheduled.

- [x] **Publish and deliver Issue 005 — issue #176** — 2026-08-29
  - Published only Issue 005 through implementation PR #177 and release PR #178;
    exact staging revision `5b9c239` and production revision `feb0523` passed
    deployment verification.
  - Verified the public issue and sample-based reinforcement-learning article
    links returned 200 before delivery.
  - Sent the existing text-only Resend broadcast
    `c2987098-1e8c-4604-af3f-7c01f83be81c` once to the nine-contact
    `aflora-production` segment after explicit action-time approval.
  - Completion check: Resend marks the broadcast sent, and Gmail received the
    production copy in Inbox/Updates rather than Spam or Promotions.

- [x] **Remove the Issue 005 email image — issue #171** — 2026-08-29
  - Removed the conceptual-shortcut image while preserving the prose, CTA, and
    required legal content.
  - Updated the existing Resend draft in place and verified the text-only test in
    Gmail before any subscriber broadcast was sent or scheduled.
  - Completion check: source and provider draft match, Gmail received the test,
    and the exact production revision passed verification.

### Learning experience

- [x] **Organize and release the article library by topic — issues #197 and #217** — 2026-10-02
  - Kept the chronological home shelf and added responsive English and Brazilian
    Portuguese catalogs with keyboard-accessible topic selection.
  - Promoted only the catalog and navigation from PR #198 through release PR
    #218; drafts and unrelated `develop` changes stayed out of production.
  - Completion check: full CI, five focused browser tests, desktop/mobile
    rendered review, exact-SHA production smoke at `c24f3eb`, both catalog
    routes, all 16 published article links, and draft-route 404s passed.

- [x] **Simplify Beyond CART routing controls — issue #212** — 2026-10-01
  - Moved both input controls onto the axis, removed hard-routing playback and duplicate x controls, kept the temperature slider, and added drag and keyboard guidance with a reduced-motion-aware pulse.
  - Completion check: PR #213 passed all required checks; seven focused browser scenarios and desktop/mobile rendered review passed locally and on Railway staging at code revision `c95f86c`.

- [x] **Refine the Beyond CART architecture builder — issue #192** — 2026-09-12
  - Expanded the fixed sample from 16 to 36 observations and added Diagonal,
    XOR, and Offset steps datasets with dataset-specific rules, leaves, and
    computed decision surfaces.
  - Rebuilt the oversized header as a compact dataset-and-preset toolbar while
    preserving selected architecture state, accessibility, and mobile layout.
  - Completion check: 88 visual tests, seven focused browser scenarios, both
    relevant typechecks, the draft build, and rendered desktop/mobile review pass.

- [x] **Complete the gradient boosting visual system — issue #136** — 2026-08-24
  - Built the regression and classification figures, animations, and
    playgrounds from two locked, deterministic one-dimensional experiments.
  - Added the complete Brazilian Portuguese article with localized figures,
    controls, interaction states, and accessible descriptions.
  - Finished the sequence with a compact loss-agnostic framework image that
    preserves the shared gradient → tree → additive-update engine.
  - Completion check: no visual specifications remain; the full repository
    gate passed and desktop, tablet, and mobile rendered reviews confirmed the
    artifacts are accessible, responsive, and contained.

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

- [x] **Craft and test Issue 005 for sample-based reinforcement learning — issue #167** — 2026-08-28
  - Reframed the issue around the shared sample-based learning loop and added
    the article's mobile conceptual-shortcut visual for legible email rendering.
  - Kept Issue 005 at `ready`, validated it in workflow run `33194644323`, and
    created protected Resend draft `c2987098-1e8c-4604-af3f-7c01f83be81c`
    exactly once in run `33194729235`.
  - Sent one provider test only to `luccaemmanuel@gmail.com`. Gmail placed it in
    Inbox/Updates with SPF, DKIM, and DMARC passing; the requested copy was then
    moved to Primary and verified absent from Spam and Promotions.
  - No subscriber broadcast was sent or scheduled.

- [x] **Publish the sample-based reinforcement-learning article — issue #160** — 2026-08-28
  - Published the reviewed English and Brazilian Portuguese article while every
    other queued article remained unavailable in the production build.
  - Added Issue 005 as a repository draft only; no provider draft, test email,
    schedule, or subscriber send was created.
  - PR #162 passed the full gate and exact-SHA staging verification on
    `acd36a7c6fde3d8c2974a3e165bd3c3719e83b7d`; release PR #164 passed the
    production policy and all quality checks.
  - Production SHA `a380fb5e24d057d1c46211a4a618155bf333b899` passed exact-SHA
    verification run `33171587204`; both canonical locale routes, language
    alternates, RSS, and sitemap were checked publicly, while Issue 005 and all
    queued draft routes returned HTTP 404.

- [x] **Add foundational metadata and Portuguese locale parity to model evaluation — issue #155** — 2026-08-27
  - Added the foundational badge and prior-knowledge description to both article headers.
  - Added the complete Brazilian Portuguese prose, metadata, visual, animation,
    playground, accessible-copy, routing, and language-switcher experience.
  - Kept both locales in draft and kept publication, deployment, merge, and
    newsletter delivery out of scope.
  - Completion check: typecheck and the draft-inclusive production build passed;
    eleven focused browser tests and rendered desktop/mobile review confirmed
    locale parity, calculations, interactions, and containment.

- [x] **Apply beta-reader revisions to model evaluation — issue #155** — 2026-08-26
  - Tightened the opening and repeated scenarios while preserving the applied recall and precision stories.
  - Added precision's zero-denominator boundary, the trivial accuracy baseline, and operational metric caveats.
  - Compared equal-accuracy models directly and clarified positive-class switching in the playground.
  - Completion check: typecheck and production build passed; eight focused browser tests
    and rendered review confirmed calculations, interaction, direct comparison, and containment.

- [x] **Refine the model-evaluation playground — issue #155** — 2026-08-26
  - Enlarged the classifier circles and dots while keeping the complete playground visible.
  - Replaced the scrolling preset pills with one selector and removed redundant explanatory labels.
  - Completion check: typecheck and production build passed; seven focused browser tests
    and responsive rendered review confirmed calculations, interaction, and containment.

- [x] **Draft the model-evaluation article — issue #155** — 2026-08-25
  - Added exact-count classifier visuals for every scenario so each stated distribution
    can be inspected directly.
  - Compacted the metrics playground and replaced typed point counts with accessible sliders.
  - Kept translation, publication, deployment, and newsletter delivery outside this draft step.
  - Completion check: typecheck and production build passed; seven focused browser
    tests verified exact scenario counts, slider calculations, interactions, and
    desktop/mobile containment; rendered review confirmed the compact hierarchy.

- [x] **Restore Portuguese locale parity for the production ACF/PACF article — issue #145** — 2026-08-21
  - Added a professional Brazilian Portuguese translation with the same learning
    progression, equations, references, and diagnostic guidance as the English article.
  - Localized all 12 static visuals, four interactive experiences, controls,
    accessible descriptions, metadata, article routing, and language alternates.
  - Full local and GitHub gates passed; the owner approved the rendered article,
    and exact-SHA production verification passed on `452b71c` before the public
    desktop and mobile routes were checked.
  - Kept newsletter creation and delivery outside the hotfix.

- [x] **Draft a sample-based introduction to reinforcement learning — issue #132** — 2026-08-21
  - Preserved and standardized the English draft and added the reviewed Brazilian
    Portuguese version with equivalent localized visuals and interactions.
  - Completed twelve accessible, responsive visuals, including the computed MDP
    trajectory and Pong reward-comparison interactions on desktop and mobile.
  - Kept the article in draft with `noindex`; production publication and newsletter
    delivery remain separate and were not performed.
  - Completion check: `pnpm check`, eight focused browser scenarios, PR #147, and
    post-merge CI passed; Railway staging verification run `32510468079` proved
    implementation SHA `ac29c0849920f8ae377a1fa000935b72db1c601a`, with both
    localized routes returning HTTP 200.

- [x] **Update and deliver the approved Issue 004 email — issue #141** — 2026-08-21
  - Moved the approved introductory copy and weekly sales chart into the
    canonical newsletter source and verified its HTML and plain-text forms.
  - Exact-SHA staging and production verification passed on `af815a0` and
    `df3a66a`, respectively, before the controlled subscriber send.
  - The Issue 004 report confirmed 8 sent, 8 delivered, 0 bounced, and 0
    complained without a duplicate broadcast.

- [x] **Publish How the Past Echoes and prepare Issue 004 — issue #137** — 2026-08-21
  - Published the reviewed English ACF/PACF article and short Issue 004 while
    keeping Bagging and later drafts out of production.
  - Recorded the missing Brazilian Portuguese translation as an explicit parity
    limitation instead of creating an unreviewed translation during release.
  - Full checks passed; exact-SHA staging and production verification passed on
    `3cdedee` and `8bac90e`, respectively, and the canonical pages were checked.
  - Created one Resend draft and confirmed the test email in the owner's Gmail
    inbox without sending or scheduling the production subscriber broadcast.

- [x] **Draft the bagging variance article — issue #120** — 2026-08-13
  - Used one fixed patient question and a noisy sine-curve laboratory to explain
    pointwise model variance, bootstrap sampling, aggregation, and the correlated-tree floor.
  - Added two computed experiments and three restrained visuals with accessible,
    responsive, keyboard, and reduced-motion behavior.
  - Incorporated beta-reader feedback and kept draft-only browser checks active in
    staging while published-only builds continue to exclude the article.
  - Completion check: the full local and GitHub gates passed; staging verification
    run `31752958060` confirmed exact revision `e79a0bec9a2d669911eb040e150af1376dfde0ed`,
    and production continued to return 404 for the draft route.

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

- [x] **Create a token-efficient beta reader skill — issue #124** — 2026-08-13
  - Added bounded initial, intermediate, and advanced reader passes with clear
    ownership of flow, mathematics, writing, examples, and technical validity.
  - Limited screen exploration to one designated reader, three meaningful
    interaction states, and one representative viewport by default.
  - Capped notes and synthesis while preserving evidence, disagreements,
    audience-specific judgments, and strengths worth protecting.
  - Moved the repository copy to the canonical `.agents/skills` discovery path
    on 2026-08-26 so it is available from branches containing `develop`.
  - Completion check: both repository and user-level copies validate, and three
    parallel fresh-context readers produced distinct, evidence-backed feedback
    while the sole explorer respected the interaction budget.

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
