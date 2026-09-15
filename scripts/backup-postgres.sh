#!/usr/bin/env bash
set -euo pipefail

# Nightly-style PostgreSQL backup. Provide DATABASE_URL or POSTGRES_* values.
OUTPUT_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${OUTPUT_DIR}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "${DATABASE_URL}" --format=custom --file="${OUTPUT_DIR}/xenior-${STAMP}.dump"
else
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    --host="${POSTGRES_HOST:-localhost}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=custom \
    --file="${OUTPUT_DIR}/xenior-${STAMP}.dump"
fi

echo "Wrote ${OUTPUT_DIR}/xenior-${STAMP}.dump"
