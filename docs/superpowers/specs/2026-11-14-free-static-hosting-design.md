# Free static Aflora hosting — issue #240

Owner request: plan, implement and test removing Railway costs, allowing email retirement and using LinkedIn for distribution. Owner selected **GitHub Pages with a public repository**, rather than Cloudflare Pages, on 2026-11-14. Keep aflora.page and existing article URLs.

## Approaches

- GitHub Pages: chosen by owner; free with public repository, no runtime server, custom-domain HTTPS, existing GitHub workflow. Repository source and history become public, including editorial drafts and operational notes; review before visibility change. No native PR preview sites.
- Cloudflare Pages Free: keeps repository private and offers branch previews; 500 builds/month, 20,000 files, 25 MiB/file. Rejected in favor of GitHub Pages.
- Keeping Railway APIs: preserves email/measurement but fails the cost and simplification goal.

## Design

Add an explicit `pnpm build:static` profile. It forces production-only content, disables newsletter/feedback/observability despite inherited environment flags, defaults to https://aflora.page with root base, and supports SITE_URL/BASE_PATH overrides for github.io. Output remains portable HTML/CSS/JS and data. No adapter, Workers, new runtime dependency or database.

Use localized RSS calls to action instead of email promises in static mode. Preserve historical newsletter issue pages. Confirmation, management and unsubscribe URLs show retirement messaging without claiming a successful database operation or making API calls. The privacy notice describes static hosting, local browser preferences and separately retained legacy records, without claiming records were deleted. No invented LinkedIn account URL.

CI builds and browser-tests static output without starting APIs. GitHub Pages deployment follows successful main Quality checks, uses only the tested commit and least-privilege Pages OIDC permissions. PRs/develop receive a downloadable static artifact for review; current Railway staging remains the transition review gate. Production remains main-only through an owner-approved release PR. Legacy services remain archived source for rollback; migration does not send email, delete records or cancel services automatically.

## Cutover

Review public exposure and scan history; configure GitHub Pages Actions source and custom-domain verification; review static artifact and staging; approved develop-to-main release; deploy Pages and verify exact revision; change DNS while Railway remains available; verify HTTPS, article deep links, both locales, RSS, 404 and LinkedIn metadata; encrypted backup and verify restore; remove Railway web/APIs/Postgres and subscription only after checks. Disable delivery and old platform monitoring after cutover. Domain renewal is separate from free hosting.

## Acceptance

No active signup, feedback or analytics controls in static output; no API network requests on old token links; published articles, language navigation and interactive labs work; canonical/OG/RSS/sitemap honor SITE_URL and BASE_PATH; drafts and email-delivery artifacts excluded; main-only deployment cannot bypass Quality checks; operational steps and remaining launch gates are explicit.
