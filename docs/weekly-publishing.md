# Publish Aflora each week

This is the writer-facing path. The longer operational manuals remain available
for setup and incident handling; ordinary publication should fit on this page.

## 1. Start the article

Create a **Weekly Aflora article** issue in GitHub. Write the learner question
first, choose the next issue ID, then create a `feature/*` branch from
`develop`.

Scaffold the newsletter issue:

```bash
pnpm weekly:new --issue 2026-002 \
  --subject "A subject that creates useful tension" \
  --article stable-article-id
```

Write the evergreen article first. The email is a short invitation to the
article, not a second copy of it. Keep both records in draft while writing.

## 2. Check the complete reader experience

```bash
pnpm weekly:check
pnpm preview
```

Review the article, `/newsletter/`, the issue page, the HTML email, and the
plain-text email. Open a pull request to `develop` that closes the weekly article
issue. GitHub builds the same newsletter preview as a downloadable artifact.

## 3. Publish the website

After CI passes, review the exact commit in Railway staging. Set the article and
issue to published, including `publishedAt`, and merge the article PR into
`develop`.

Run the **Prepare weekly release** workflow. It opens the `develop` to `main`
release PR. Complete its checklist, apply `production-approved`, and merge.
Wait for the production deployment verification, then open the canonical article
and issue in a private browser window.

Publishing the website never sends email.

## 4. Send the newsletter

Run **Controlled newsletter delivery** from GitHub Actions:

1. choose `draft` and the issue ID;
2. inspect the Resend draft on desktop and mobile, including links, sender,
   reply-to, footer, and plain text;
3. run it again with `send` or `schedule`; and
4. enter `SEND:<issue-id>` in the confirmation field.

The workflow refreshes and sends the reviewed broadcast. It refuses duplicate
broadcasts, unpublished issues, missing unsubscribe or postal content, and
delivery initiated by anyone other than the repository owner.

## 5. Close the loop

After provider events arrive:

```bash
pnpm newsletter:report --issue 2026-002
```

Check delivery, clicks, bounces, and complaints. Investigate any complaint
before the next issue. That completes the week.

If the site, API, provider, or database is unhealthy, stop before sending and
use the recovery paths in
[`newsletter-operations.md`](newsletter-operations.md) and
[`database-recovery.md`](database-recovery.md).
