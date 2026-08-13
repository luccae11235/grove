# Weekly publishing guideline

Use this page for the ordinary path from an article idea to a published article
and a newsletter received by subscribers. Drafts accumulate in Railway staging;
production receives one reviewed article each Friday.

> **Two separate approvals:** publishing the website does not send the
> newsletter. Never send or schedule the email merely because a pull request was
> merged or a deployment succeeded.

## A. Add an article to the staging queue

Do this whenever an article is ready for review. It does not need to be release
week.

- [ ] Create a GitHub issue with the learner question, acceptance criteria,
  newsletter issue ID, and target Friday.
- [ ] Create a `feature/*` branch from the latest `develop` and link it to the
  issue.
- [ ] Write the article with `status: draft`.
- [ ] Create its newsletter issue and keep that at `status: draft` too:

  ```bash
  pnpm weekly:new --issue 2026-002 \
    --subject "A clear invitation to the article" \
    --article stable-article-id
  ```

- [ ] Keep the email short: introduce one useful question and invite the reader
  to the article instead of repeating it.
- [ ] Run `pnpm weekly:check` and `pnpm preview`. Review the article, newsletter
  page, issue page, HTML email, and plain-text email on desktop and mobile.
- [ ] Open a pull request to `develop` with `Closes #<issue>`. Pass CI, merge it,
  and wait for the exact commit to deploy to Railway staging.
- [ ] Review the staging article and email artifacts. Confirm production still
  hides the draft.

The article is now **queued**. Leave its article and newsletter issue as drafts
until its Friday release. More draft articles may be merged into `develop` and
stacked behind it.

## B. Publish one queued article on Friday

### 1. Promote the selected draft

- [ ] Choose exactly one queued article and confirm its issue ID, links,
  translations, and `publishedAt` date.
- [ ] Create a publication issue and a new `feature/*` branch from the latest
  `develop`.
- [ ] Change only the selected article and its newsletter issue from `draft` to
  `published`; add their `publishedAt` values. Leave later articles as drafts.
- [ ] Complete the [editorial release checklist](editorial-release-checklist.md)
  and run `pnpm run check`.
- [ ] Open a pull request to `develop` with `Closes #<issue>`. After CI passes,
  merge it and wait for the exact commit in Railway staging.
- [ ] In staging, verify the published-only library, article, newsletter issue,
  language alternates, RSS feed, sitemap, and every email link.

### 2. Release the website

- [ ] Run the **Prepare weekly release** GitHub workflow. It opens the
  `develop` → `main` release pull request.
- [ ] Complete the release checklist. Confirm the exact staging revision is the
  revision being promoted.
- [ ] Apply `production-approved` only when the Friday release is ready, then
  merge the release pull request.
- [ ] Wait for production deployment verification to pass.
- [ ] Open the canonical article and newsletter issue in a private browser
  window. Stop if either page or any important link is wrong.

At this point the website is live. **No email has been sent.**

### 3. Draft and test the newsletter

- [ ] Run **Controlled newsletter delivery** with action `validate` and the
  published issue ID.
- [ ] Run it again with action `draft`. This creates one protected Resend
  broadcast; do not create a second broadcast manually.
- [ ] Review the Resend draft: subject, sender, reply-to, article link,
  unsubscribe link, postal footer, desktop/mobile layout, and plain text.
- [ ] From that Resend draft, use **Test Email** to send a copy to your own
  inbox. Open it on a phone and desktop, proofread it, and follow every link.
  A test email does not include the custom reply-to, so verify reply-to in the
  draft separately.
- [ ] Correct any problem in source, publish the fix through the same staging
  and production gates, and create a fresh reviewed draft before continuing.

### 4. Send to subscribers

- [ ] Confirm production is healthy, the article is public, the test email
  passed, and the production segment is correct.
- [ ] Run **Controlled newsletter delivery** with action `send` (or `schedule`
  for Friday), the same issue ID, and confirmation `SEND:<issue-id>`.
- [ ] Do not use the Resend dashboard's Send button; the GitHub workflow applies
  the duplicate-send, issue-state, ownership, and content safeguards.
- [ ] Wait for delivery events, then run:

  ```bash
  pnpm newsletter:report --issue 2026-002
  ```

- [ ] Record sent, delivered, clicked, bounced, and complained counts in the
  publication issue. Investigate any complaint or unexpected bounce before the
  next send, then close the issue.

The Friday release is complete only when the production page is verified, the
subscriber send is confirmed, and the report has been reviewed.

For setup, incidents, duplicate warnings, or recovery, stop and use the
[newsletter operating manual](newsletter-operations.md), the
[production runbook](production-and-release-runbook.md), and the
[database recovery guide](database-recovery.md).
