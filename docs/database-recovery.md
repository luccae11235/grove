# Database backup and recovery

The production PostgreSQL database contains subscriber consent and delivery
state. A database backup is useful only if it can be restored and reconciled
before another newsletter is sent.

## Current evidence

On 2026-07-24, production was streamed with PostgreSQL 18 `pg_dump` in custom
format directly into a temporary database on the isolated staging PostgreSQL
service. The restored table counts matched production exactly:

| Table | Production | Restored |
| --- | ---: | ---: |
| `newsletter_broadcasts` | 1 | 1 |
| `newsletter_events` | 5 | 5 |
| `newsletter_subscribers` | 1 | 1 |
| `schema_migrations` | 1 | 1 |

The temporary database was dropped after verification, and a follow-up query
confirmed that no restore-test database remained.

Railway native volume backup and schedule mutations returned `Not Authorized`
for the current Hobby workspace. Daily and weekly native backups therefore
remain blocked until the owner enables a plan/capability that exposes them or
approves a separately encrypted off-platform backup design.

## Restore procedure

1. Pause newsletter delivery. If database integrity is uncertain, also disable
   public signup while keeping the static website available.
2. Choose an isolated non-production PostgreSQL target. Never restore over
   production as the first test.
3. Use matching PostgreSQL client tools and stream or download the selected
   custom-format dump.
4. Create a uniquely named temporary database, restore with `pg_restore`, and
   fail on SQL errors.
5. Compare migration level and counts for subscribers, broadcasts, and events.
   Inspect active, unsubscribed, bounced, complained, and suppressed states.
6. Drop the temporary database after the evidence is recorded.
7. For a real recovery, restore into a new production database, replay newer
   signed Resend webhooks where available, reconcile provider contacts and
   suppression state, then point the API at the recovered database.
8. Require `/health`, signup/confirmation safety checks, and an issue report
   before re-enabling signup or delivery.

Do not copy database URLs or dumps into issues, logs, or repository files.
