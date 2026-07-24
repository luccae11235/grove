#!/usr/bin/env bash

set -euo pipefail
umask 077

if [ "$#" -ne 1 ]; then
  echo "Usage: pnpm newsletter:backup -- /absolute/path/to/backup-directory" >&2
  exit 2
fi

backup_directory="$1"
case "$backup_directory" in
  /*) ;;
  *)
    echo "The backup directory must be an absolute path." >&2
    exit 2
    ;;
esac

for command_name in railway jq openssl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is not installed: $command_name" >&2
    exit 1
  fi
done

pg_dump_command=""
if command -v brew >/dev/null 2>&1; then
  libpq_prefix="$(brew --prefix libpq 2>/dev/null || true)"
  if [ -n "$libpq_prefix" ] && [ -x "$libpq_prefix/bin/pg_dump" ]; then
    pg_dump_command="$libpq_prefix/bin/pg_dump"
  fi
fi
if [ -z "$pg_dump_command" ]; then
  pg_dump_command="$(command -v pg_dump || true)"
fi
if [ -z "$pg_dump_command" ]; then
  echo "pg_dump is required. On macOS, install it with: brew install libpq" >&2
  exit 1
fi
pg_restore_command="${pg_dump_command%/pg_dump}/pg_restore"
if [ ! -x "$pg_restore_command" ]; then
  echo "pg_restore must be installed beside pg_dump." >&2
  exit 1
fi

mkdir -p "$backup_directory"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$backup_directory/aflora-newsletter-$timestamp.dump.enc"
checksum_path="$backup_path.sha256"
temporary_path="$(mktemp "$backup_directory/.aflora-newsletter-backup.XXXXXX")"

cleanup() {
  rm -f "$temporary_path"
}
trap cleanup EXIT

postgres_service="${AFLORA_POSTGRES_SERVICE:-Postgres-W7GK}"
database_url="$(
  railway variable list \
    --environment production \
    --service "$postgres_service" \
    --json |
    jq -er '.DATABASE_PUBLIC_URL'
)"

echo "Creating an encrypted PostgreSQL backup."
echo "Choose a strong passphrase and store it in your password manager."
read -r -s -p "Backup passphrase: " backup_passphrase </dev/tty
echo
read -r -s -p "Repeat passphrase: " repeated_passphrase </dev/tty
echo
if [ -z "$backup_passphrase" ] || [ "$backup_passphrase" != "$repeated_passphrase" ]; then
  echo "Passphrases did not match." >&2
  exit 1
fi
unset repeated_passphrase

PGDATABASE="$database_url" "$pg_dump_command" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl |
  AFLORA_BACKUP_PASSPHRASE="$backup_passphrase" openssl enc \
    -aes-256-cbc \
    -salt \
    -pbkdf2 \
    -iter 200000 \
    -pass env:AFLORA_BACKUP_PASSPHRASE \
    -out "$temporary_path"
unset backup_passphrase

mv "$temporary_path" "$backup_path"
openssl dgst -sha256 -r "$backup_path" | awk '{print $1}' > "$checksum_path"

echo "Backup created:"
echo "  $backup_path"
echo "Checksum:"
echo "  $checksum_path"
echo "Verify it without restoring:"
echo "  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in \"$backup_path\" | \"$pg_restore_command\" --list >/dev/null"
