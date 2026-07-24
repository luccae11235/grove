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
for the current Hobby workspace. The owner has accepted encrypted off-platform
logical backups as the current policy for the small subscriber list; native
scheduled backups can be reconsidered if the audience or operational needs grow.

## Manual encrypted backup

For the current small subscriber list, create an encrypted logical backup after
each publication and after any subscriber import:

```bash
pnpm newsletter:backup -- "/absolute/path/to/Aflora Backups"
```

The command reads the production public database URL from Railway without
printing it, streams a compressed custom-format `pg_dump` through AES-256
encryption, writes the result outside the repository with owner-only
permissions, and creates a SHA-256 checksum. Store the passphrase in a password
manager; neither the repository nor Railway can recover it.

Verify the encrypted archive before treating it as a backup:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in "/absolute/path/to/backup.dump.enc" |
  pg_restore --list >/dev/null
```

Keep at least two recent files on different physical or cloud-encrypted storage.
Do not export subscriber CSV as the primary backup: it omits consent tokens,
suppression state, broadcasts, events, and migrations.

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
