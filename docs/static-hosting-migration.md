# Aflora: Railway → GitHub Pages Free

Issue: [#240](https://github.com/luccae11235/grove/issues/240). Owner selected
GitHub Pages with a public repository on 2026-11-14. This runbook supersedes the
Railway/newsletter launch instructions **for the static migration**. Historical
runbooks and runtime code remain available for recovery.

**Completed 2026-11-15.** The execution record below is the current state.
Checklist sections explicitly labelled **reference** are reusable procedures,
not open migration tasks. Optional domain ownership hardening and LinkedIn Post
Inspector checks are identified separately; neither is a publication gate.

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

## Disclosure review checklist (reference)

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

## Prepare Pages and release (reference)

- [ ] Complete the feature PR into `develop`, all checks and staging review.
- [x] Preserve the existing registrar/DNS zone and export its records.
- [ ] Optional hardening: verify ownership of `aflora.page` in the account Pages
      settings in addition to the active repository custom-domain association.
- [x] Repository Settings → Pages → Source: **GitHub Actions**. Set custom domain
      `aflora.page` in Pages settings; an Actions deployment does not use a CNAME
      file as its domain configuration. Actions source and `aflora.page` were
      configured on 2026-11-14. The approved production artifact was deployed by
      run `43628322160`; DNS was switched on 2026-11-15.
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

## Staging evidence — 2026-11-14

The exact `static-site-domain` artifact from successful CI run `43614313786`
(feature code revision `c1301cf`, tested PR merge SHA `05e0cb052314942e766f0f2324982c7107773945`)
was copied byte-for-byte into a temporary Caddy container and deployed to the
existing Railway staging web service. Deployment:
`c19d3402-f13c-458c-b8c2-638cc737874f`.

[Review staging](https://grove-web-staging.up.railway.app/).
`version.json` reports `mode=static` and the tested merge SHA. The container serves
files only and adds `X-Robots-Tag: noindex, nofollow`; no service variables, APIs,
production services or databases were changed. All six remote browser scenarios
passed, including mobile/desktop, article hydration, locales, images/srcset, RSS,
legacy action links and correct 404 behavior. Wait for the Astro island to finish
hydrating before testing its first button interaction over a real network.

Repeat the remote verification without starting a local server:

```bash
PLAYWRIGHT_STATIC_URL=https://grove-web-staging.up.railway.app/ pnpm test:static
```

Railway's normal `develop` autodeploy may replace this temporary artifact after
integration; the deployment ID and artifact SHA above are the immutable review
evidence. The production approval and publication evidence is recorded below.

## DNS cutover and verification

### Execution record — 2026-11-15

- Feature PR #241 merged into `develop`; release #243 received explicit owner
  approval and the `production-approved` label before merging into `main`.
- Production SHA: `d8009c63579a08b9bfa643a684f0e9f099156e6b`.
  Quality checks run `43627931553` passed all seven jobs; Pages publication
  `43628322160` deployed its tested artifact. `STATIC_HOSTING_ENABLED=true`.
- Namecheap BasicDNS now has the four documented apex A records and
  `www CNAME luccae11235.github.io`, each with a one-minute TTL. Both authoritative
  nameservers and public resolvers confirm them. Mail records were preserved.
  The original 14-record DNS snapshot is in the private backup folder.
- Final production/staging archives are dated `20261115T135542Z`. Both were
  decrypted and fully restored into temporary staging databases; all 15 public
  tables' row counts matched. Temporary restore databases were removed.
- An additional detached historical production volume was exported as a cold
  PostgreSQL directory archive dated `20261115T135529Z`; decryption and all 1,281
  file hashes were verified. This is a cold archive, separate from the two
  application dumps that passed full database restoration.
- Backup location: the owner's `Documents/Aflora Backups` folder, outside Git,
  owner-only permissions. Passphrase: macOS Keychain item
  `aflora-newsletter-backup`; never put it in issues, logs or this repository.
- Completed: valid TLS for apex and `www` (certificate expires 2027-02-13),
  HTTPS enforcement and canonical redirects. All six remote browser scenarios
  passed on `https://aflora.page`; desktop/mobile visual review also passed.
  Both privacy pages match the configured public contact. Sharing title/image
  metadata was checked in the browser suite; LinkedIn posting was not performed.
- `STATIC_DNS_LIVE=true`; Pages run `43628322160`, attempt 3, passed the public
  exact-revision probe after publication. `STATIC_HOSTING_ENABLED=true` also
  keeps the old newsletter delivery workflow disabled.
- Resend: zero active/scheduled broadcasts; removed both retired webhooks and
  the `grove-staging` / `aflora-production` keys. Both old keys subsequently
  returned `API key is invalid`. Contacts, consent backups and sent history were
  preserved; no email was sent. The unrelated Onboarding key was left in place.
- Removed six obsolete GitHub repository secrets and revoked/removed the temporary
  SSH backup identity. Mail DNS was preserved; `api` and the three Railway
  verification records were removed after retirement.
- Railway accepted project deletion at 2026-11-15T14:21:22Z, scheduled for permanent
  deletion at 2026-11-17T14:21:22Z. The CLI reports the project as deleted. Billing
  shows the Hobby subscription already cancelled, active only until 2026-11-21;
  no renewal was requested. Previously accrued usage may still be invoiced.
- The owner separately authorized deleting the other shared-workspace project.
  Its two database archives were fully restored and its configuration encrypted.
  Object storage returned `AccessDenied`; after being told the object counts and
  sizes, the owner explicitly authorized disposal of those files and historical
  backups without copy. That deletion is scheduled for 2026-11-17T14:03:48Z.
- Recovery instructions and private verification/cancellation receipts are in the
  same owner-only backup folder. Do not publish subscriber counts or config dumps.

### Reusable cutover procedure (reference)

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
- [ ] Optional LinkedIn-specific check: inspect a shared article in Post Inspector.
      The automated suite already verifies its HTML sharing title/image metadata.

## Retirement procedure (reference; only after verification)

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

## Current production state

Aflora serves the approved static release on GitHub Pages with valid, enforced
HTTPS. Railway project deletion was accepted and no deployments remain active;
permanent deletion is scheduled for 2026-11-17. The Hobby subscription is cancelled,
with the current period ending 2026-11-21. The execution record distinguishes
these provider dates from completed site, backup and integration verification.
