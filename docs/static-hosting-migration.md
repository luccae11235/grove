# Aflora: Railway → GitHub Pages Free

Issue: [#240](https://github.com/luccae11235/grove/issues/240). Owner selected
GitHub Pages with a public repository on 2026-11-14. This runbook supersedes the
Railway/newsletter launch instructions **for the static migration**. Historical
runbooks and runtime code remain available for recovery; existing production
continues to use them until cutover.

## Cost and choice

| Option | Hosting cost | Repository | Operations |
| --- | --- | --- | --- |
| **GitHub Pages (chosen)** | Free within limits | Public on GitHub Free | GitHub Actions → static files; no server/database |
| Cloudflare Pages Free | Free within limits | Can remain private | Another provider; native branch previews |
| Railway with APIs | Recurring usage | Private or public | Web, newsletter, observability, PostgreSQL, backups |

GitHub Pages currently allows a 1 GB published site, soft 100 GB/month bandwidth
and a 10 minute deployment timeout. Custom Actions workflows are exempt from the
soft 10 builds/hour limit. Aflora is an educational publication, with no payments
or commercial SaaS flow. Domain renewal is **not** free: keep paying the registrar
for `aflora.page`, or use `luccae11235.github.io/grove/` to remove that cost too.
Free hosting remains subject to provider limits and terms.

Sources checked 2026-11-14:
[Pages availability and limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits),
[custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Astro deployment](https://docs.astro.build/en/guides/deploy/github/),
[Cloudflare limits](https://developers.cloudflare.com/pages/platform/limits/).

## Build and review

```bash
pnpm install --frozen-lockfile
pnpm build:static
pnpm test:static
pnpm preview
```

Requires Node 22+, pnpm and Python. No provider credentials or database. The
static build forces `SHOW_DRAFTS=false`, `PUBLIC_STATIC_SITE=true`, empty API URLs,
and disabled readership/feedback even if inherited flags enable them. It excludes
email HTML/text delivery routes; the manifest has no delivery entries. It retains
published newsletter web pages as historical evidence. No subscriber operations
or emails are performed by the build. `version.json` contains the release SHA and
`mode: static`; `.nojekyll` preserves underscore-prefixed Astro assets.

Default canonical origin: `https://aflora.page`, root base `/`. To test the free
provider URL instead:

```bash
SITE_URL=https://luccae11235.github.io BASE_PATH=/grove/ pnpm build:static
SITE_URL=https://luccae11235.github.io BASE_PATH=/grove/ pnpm test:static
```

CI tests both configurations without APIs or PostgreSQL and uploads
`static-site-domain` and `static-site-github-subpath`. Download the domain artifact
from the PR's Quality checks run, unpack it and serve it with
`python3 -m http.server 8080 --directory <unpacked-directory>` for review.
Check desktop/mobile, both languages, article interactions, old newsletter action
links, RSS and OG image. GitHub Pages itself provides one site per repository,
not separate PR previews. Keep Railway staging for transition review; after
retirement use the PR static artifact locally as the staging review gate.

Distribution is the article URL posted on LinkedIn. Existing Open Graph title,
description and 1200×630 image remain in HTML for crawlers. No LinkedIn account URL
has been assumed or added. RSS is the optional follow mechanism.

## Before making the repository public

- [ ] Review **all branches, history, issues, PRs and Actions logs/artifacts** for
      disclosure. Public source includes article drafts and internal operational
      notes even though production output excludes drafts.
- [ ] Scan full Git history with a dedicated secret scanner; rotate any real
      credential found before opening visibility. Never print secret values.
      Gitleaks 8.30.1 scanned all local refs (221 commits, 7.13 MB) on
      2026-11-14: five findings, all independently verified as the same explicit
      `observability-test-secret-at-least-32-characters` test fixture in test/CI
      files. No real credential was identified. Initial heuristic scan found zero private-key, GitHub-token,
      Resend-token or nonlocal database-credential patterns; this is not a complete
      personal-data audit. A further local scan of GitHub issues, PR conversations
      and review comments (1.30 MB) found one generic-key match, verified as a
      deployment UUID rather than a credential; email references belonged to the
      operator. No tracked environment file besides `.env.example`,
      database dump, private key or backup archive was found in the local refs.
- [ ] Review contact data and sender postal details; redact/move anything the owner
      does not intend to publish. Consider old attachments and delivery logs too.
- [x] After local disclosure review, changed `luccae11235/grove` to public in
      repository Settings → General → Danger Zone (completed 2026-11-14). The owner already selected
      public visibility; the remaining gate is disclosure review, not choosing
      the provider again. GitHub visibility changes expose historical content.

## Prepare Pages and release

- [ ] Complete the feature PR into `develop`, all checks and staging review.
- [ ] Verify ownership of `aflora.page` in the account Pages settings before DNS
      cutover. Preserve the existing registrar/DNS zone and export its records.
- [x] Repository Settings → Pages → Source: **GitHub Actions**. Set custom domain
      `aflora.page` in Pages settings; an Actions deployment does not use a CNAME
      file as its domain configuration. Actions source and `aflora.page` were
      configured on 2026-11-14; DNS still points to Railway and no Pages artifact
      has been deployed.
- [ ] Configure the `github-pages` environment to permit only `main` deployments;
      add owner review protection if available. Keep `STATIC_HOSTING_ENABLED`
      unset/false until the approved production release is ready.
- [ ] Open `develop` → `main` release PR and obtain explicit owner production
      approval recorded by `production-approved`. No direct main push/merge.
- [ ] Set repository Actions variable `STATIC_HOSTING_ENABLED=true` immediately
      before the approved release merge. This also stops scheduled legacy platform
      probes and blocks the manual newsletter delivery workflow. Disable any
      external Resend schedules/automations separately; this variable cannot
      cancel provider schedules or already-queued deliveries.
- [ ] Merge the approved release. `Publish static Aflora` waits for a successful
      main-push **Quality checks** run, downloads its tested `static-site-domain`
      artifact, checks its embedded SHA, and deploys with Pages OIDC permissions.
      It never runs for PRs or `develop`. A failed check prevents deployment.
      Superseded main revisions are rejected before publication. During the first
      cutover, leave `STATIC_DNS_LIVE` unset: Pages deployment success confirms
      artifact readiness while the custom domain still points to Railway.
      After DNS/HTTPS verification, set repository variable `STATIC_DNS_LIVE=true`
      and re-run the Pages job to enable the live exact-revision probe. Subsequent
      deployments then fail if the public domain does not serve the expected SHA.
      If publication needs retry, re-run that successful run's Pages deployment;
      if the artifact has expired, trigger a new Quality checks **push** via a new
      reviewed release (manual Quality checks runs cannot publish).

## DNS cutover and verification

Keep Railway running through this stage. Configure the custom domain on GitHub
**before** pointing DNS at it. For apex `aflora.page`, replace Railway web records
with GitHub's documented A records (`185.199.108.153`, `185.199.109.153`,
`185.199.110.153`, `185.199.111.153`) or supported ALIAS/ANAME. Remove conflicting
old apex A/AAAA/CNAME records; use only GitHub's current documented IPv6 records
if enabling IPv6. `www` may CNAME to `luccae11235.github.io` if desired. Do not alter
mail MX/TXT/DKIM records during the web cutover. Enable **Enforce HTTPS** once the
certificate is ready. `.page` requires HTTPS; do not retire Railway before TLS works.

Follow [GitHub's current DNS instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
Propagation can take up to 24 hours. Verify from a clean browser/network:

- [ ] `https://aflora.page/version.json`: `mode=static`, exact release SHA.
- [ ] Home, `/pt-br/`, both article indexes, published article deep links and lab
      interactions; no forms/API calls or console errors; unknown URLs return 404.
- [ ] `/rss.xml`, `/pt-br/rss.xml`, sitemap, robots, canonical/hreflang and OG image.
- [ ] Existing newsletter web issues and old token/action URLs explain retirement.
- [ ] LinkedIn Post Inspector sees correct title/image for a shared article URL.

## Retire recurring costs (only after verification)

- [ ] Pause old subscription ingress and cancel **all scheduled** Resend broadcasts,
      provider automations and external jobs. Do not send a final email implicitly.
- [ ] Create encrypted backups of production and staging subscriber, suppression,
      consent, feedback and readership data; verify a restore using
      [database recovery](database-recovery.md). Store outside Git and public artifacts.
- [ ] Preserve a reachable public privacy contact for historical data requests;
      CI maps the existing `PUBLIC_PRIVACY_CONTACT_EMAIL` repository variable
      into static builds; verify the displayed address is still reachable.
      Agree retention/deletion independently: retirement does not delete records.
- [ ] Remove Resend webhooks pointing at retired APIs; revoke unused API keys and
      remove retired GitHub/Railway secrets. If Resend has a paid plan, cancel it.
      Keeping a free Resend account is optional; the site no longer needs it.
- [ ] Remove Railway **both environments**: web, newsletter-api,
      observability-api, PostgreSQL and persistent volumes, after verified backups.
- [ ] Cancel the Railway paid subscription/workspace plan and inspect billing for
      remaining usage or services. Removing the web service alone does not stop
      database/volume/plan charges. This is the point at which savings are confirmed.
- [ ] Remove stale `api.aflora.page` and Railway-specific DNS after no clients need
      them. Keep email records needed by unrelated mailboxes.
- [ ] Record verified production revision, backup location and cancellation outcome
      on issue #240; mark the task queue complete only then.

## Rollback

Before deleting Railway: restore saved web DNS records, confirm old host HTTPS
and revision, set `STATIC_HOSTING_ENABLED=false` to resume legacy probes/delivery
availability only if deliberately restoring those services, and disable Pages
automatic publishing. Never re-enable email delivery merely to roll back the site.
The legacy runtime build is `pnpm build`; static mode is explicit. After deletion,
rollback requires rebuilding services and restoring the encrypted backup. Prefer
redeploying the previous tested static release through a reviewed release PR.

## Current boundary

Implementation, tests, public repository and Pages configuration prepare the
migration. The production-approved release, remote staging review, DNS/TLS checks,
verified backups and actual service /
subscription cancellation must be recorded separately. A green PR alone does not
prove Railway billing stopped.
