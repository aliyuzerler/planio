#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL yedekleme (pg_dump custom format) + eski yedekleri temizleme.
# Harici kopya için BACKUP_S3_URI (ör. s3://bucket/xenior-backups) verilirse
# aws s3 cp ile yüklenir (AWS CLI kurulu olmalı).
#
# Kurulum (sunucuda crontab -e):
#   30 3 * * * cd /opt/planio && DATABASE_URL="$(grep ^DATABASE_URL docker/.env.production | cut -d= -f2-)" \
#     bash scripts/backup-postgres.sh >> /var/log/xenior-backup.log 2>&1
#
# Geri yükleme testi (yılda en az bir kez yapılmalı):
#   pg_restore --clean --if-exists --dbname "<hedef DB URL>" backups/xenior-<zaman>.dump
#
# Ortam değişkenleri:
#   DATABASE_URL      ya da POSTGRES_HOST/USER/PASSWORD/DB
#   BACKUP_DIR        yedek dizini (varsayılan ./backups)
#   BACKUP_RETENTION  tutulacak yedek sayısı (varsayılan 14)

OUTPUT_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${OUTPUT_DIR}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "${DATABASE_URL}" --format=custom --file="${OUTPUT_DIR}/xenior-${STAMP}.dump"
else
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    --host="${POSTGRES_HOST:-localhost}" \
    --username="${POSTGRES_USER:?POSTGRES_USER gerekli}" \
    --dbname="${POSTGRES_DB:?POSTGRES_DB gerekli}" \
    --format=custom \
    --file="${OUTPUT_DIR}/xenior-${STAMP}.dump"
fi

echo "$(date -u +%FT%TZ) yedek yazıldı: ${OUTPUT_DIR}/xenior-${STAMP}.dump"

# Belirtilen sayıdan eski yedekleri sil (en yeniler korunur).
REMOVED=0
while IFS= read -r old; do
  rm -f "${old}"
  REMOVED=$((REMOVED + 1))
done < <(ls -1t "${OUTPUT_DIR}"/xenior-*.dump 2>/dev/null | tail -n +$((RETENTION + 1)))
[[ ${REMOVED} -gt 0 ]] && echo "${REMOVED} eski yedek silindi (retention=${RETENTION})."

# Opsiyonel harici kopya (S3). Sunucu çökse bile yedeklerin kurtarılabilir
# olması için önerilir.
if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "${OUTPUT_DIR}/xenior-${STAMP}.dump" "${BACKUP_S3_URI}/xenior-${STAMP}.dump"
    echo "S3'e kopyalandı: ${BACKUP_S3_URI}/xenior-${STAMP}.dump"
  else
    echo "UYARI: aws cli kurulu değil, S3 kopyası atlandı." >&2
  fi
fi
