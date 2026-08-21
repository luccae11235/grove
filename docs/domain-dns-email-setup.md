# Domain, DNS, and email-sending setup

This runbook records the production shape Grove expects. Fill the ownership
record before launch; do not commit provider credentials, verification tokens,
or subscriber data.

## Ownership record

Keep these values in the team's password manager or operational inventory:

| Item | Value to record |
| --- | --- |
| Registrar account and owner | Account, recovery contact, renewal owner |
| DNS provider and zone owner | Provider, account, zone, recovery contact |
| Public website hostname | For example `www.example.com` |
| Newsletter API hostname | For example `newsletter-api.example.com` |
| Sending domain or subdomain | For example `mail.example.com` |
| Railway project and owner | Project, environment, service owners |
| Resend account and owner | Account, sending domain, production segment |
| Monitored addresses | Privacy, reply-to, and abuse/deliverability contacts |

Enable multi-factor authentication, least-privilege access, registrar lock, and
automatic renewal. Record who can recover each account without storing secrets in
this repository.

## Railway custom domains

Create one Railway project containing PostgreSQL, `grove-web`, and
`grove-newsletter-api`. Both application services use the repository root as the
build context and their committed `railway.json` files.

1. Deploy the API and web services on Railway-generated domains first.
2. Add the intended API hostname to `grove-newsletter-api` and the website
   hostname to `grove-web` in Railway.
3. Copy the exact DNS target Railway displays for each custom domain. Create the
   requested `CNAME`, `A`, or `ALIAS/ANAME` record at the DNS provider; do not
   guess a target or copy one from this guide.
4. Wait for Railway to show the domains and certificates as active, then verify
   HTTPS without certificate warnings.
5. Set the final origins:
   - web: `SITE_URL`, `PUBLIC_NEWSLETTER_API_URL`,
     `PUBLIC_PRIVACY_CONTACT_EMAIL`, and `NEWSLETTER_POSTAL_ADDRESS`;
   - API: `WEB_URL`, `API_PUBLIC_URL`, and `ALLOWED_ORIGINS`, plus the secrets
     listed in `.env.example`.
6. Use origins without paths or trailing slashes. `ALLOWED_ORIGINS` must list
   exact comma-separated HTTPS origins and cannot use `*`.
7. Redeploy the API, confirm `GET https://<api-host>/health`, then rebuild the web
   service so the final API origin is embedded in the static signup form.

If the apex domain must redirect to `www` (or the reverse), configure one
canonical hostname and a permanent redirect at the DNS/edge provider. Keep
`SITE_URL`, canonical tags, feeds, sitemap, and newsletter links on that same
hostname.

## Resend sending-domain authentication

Use a dedicated sending subdomain when practical so email reputation and website
routing can be managed independently.

1. Add the sending domain in Resend.
2. Copy every DNS record exactly as Resend displays it. These commonly include
   DKIM records and an SPF record for the return path; names and values are
   account-specific.
3. If Resend requests a DMARC record and the organizational domain has none,
   start with a monitored policy such as `p=none` and a reporting mailbox. Move
   to enforcement only after reviewing legitimate senders. Maintain one SPF TXT
   record per hostname by combining authorized providers rather than publishing
   conflicting records.
4. Wait for Resend to mark the domain verified. Confirm that
   `NEWSLETTER_FROM` uses the verified domain and that `NEWSLETTER_REPLY_TO` is a
   monitored mailbox.
5. Verify a second sending subdomain for transactional mail, such as
   `confirm.example.com`, and set `NEWSLETTER_TRANSACTIONAL_FROM` to an address
   on it. Keep Resend open and click tracking disabled for this identity so
   confirmation links and pixels are not rewritten through a shared tracking
   domain. Publish a DMARC record for the transactional subdomain even when the
   provider treats it as optional, and confirm that receivers report DMARC as
   passing. This separates confirmation reputation from marketing broadcasts;
   do not switch the variable until Resend reports the subdomain verified.
6. Create the production segment (and optional topic), configure the signed
   webhook at `https://<api-host>/v1/webhooks/resend`, and store its signing
   secret only in Railway and the repository-level GitHub Actions secrets.

DNS changes can take time according to the record TTL. Keep existing records in
place during a migration, lower TTL before a planned cutover when supported, and
remove old records only after both traffic and email authentication have been
verified.

## GitHub delivery environment

For the current private GitHub Free repository, configure the repository-level
variables and secrets consumed by `.github/workflows/newsletter-delivery.yml`;
use the same final web and API origins as Railway. The workflow is restricted to
the repository owner and requires an issue-scoped confirmation. A normal push
or deploy must never send an issue. Move this configuration to a protected
environment if the repository or plan later supports one.

## Launch verification

- [ ] Website and API DNS resolve from a network outside the registrar account.
- [ ] HTTPS certificates are valid and automatic renewal is enabled.
- [ ] The website emits the intended canonical URLs, sitemap, RSS links, and
  `robots.txt` URLs.
- [ ] API `/health` passes, the signup origin is allowed, and wildcard CORS is
  rejected.
- [ ] Resend reports the sending domain verified; SPF, DKIM, and DMARC results
  pass in received test-message headers.
- [ ] A real confirmation message uses the dedicated transactional From domain,
  contains no tracking rewrite or pixel, and passes SPF, DKIM, and DMARC in the
  received-message headers before production signup uses that identity.
- [ ] Privacy, reply-to, postal, and recovery contacts are real and monitored.
- [ ] Double opt-in, confirmation, unsubscribe, bounce, complaint, and signed
  webhook handling pass the pre-launch sequence in
  [newsletter-operations.md](newsletter-operations.md).
- [ ] Registrar, DNS, Railway, Resend, and GitHub ownership and recovery details
  are recorded outside the repository.

Recheck the ownership record, domain expiry, DNS records, certificate status,
sender authentication, webhook delivery, and monitored mailboxes at least once a
quarter and after any provider or owner change.
