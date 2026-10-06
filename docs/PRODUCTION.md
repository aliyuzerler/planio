# Production readiness

Bu doküman ortamları, dağıtımı, TLS'i, yedekleri ve kalan operasyonel
riskleri kapsar. `SECURITY.md` ve `DATABASE.md` yerine geçmez.
Canlıya alma için adım adım liste: `docs/GO-LIVE-CHECKLIST.md`.

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | `production` |
| Database | Local Docker Postgres | Isolated Postgres 16 | Isolated Postgres 16 |
| Redis | Local Docker Redis | Isolated Redis 7 | Isolated Redis 7 |
| JWT secrets | Local placeholders allowed | Unique 32+ char secrets | Unique 32+ char secrets, never placeholders |
| `CREDENTIALS_ENCRYPTION_KEY` | Optional (falls back to JWT secret) | Required, distinct | Required, distinct from JWT secrets |
| iyzico | Mock if keys empty | Sandbox keys | Live keys |
| `IYZICO_BASE_URL` | Sandbox default | `https://sandbox-api.iyzipay.com` | Live iyzico URL from the merchant panel |
| Swagger `/api/docs` | Enabled | Disabled | Disabled |
| CORS | `WEB_URL`, `ADMIN_URL` | Staging origins only | Production origins only |
| Admin | Optional | Required `ADMIN_URL` | Required `ADMIN_URL` |
| Object storage | `local` driver | `s3` | `s3` (required) |

Never reuse development JWT secrets, database passwords, or iyzico keys in
staging or production. The API rejects placeholder JWT values, missing
iyzico credentials, a missing `CREDENTIALS_ENCRYPTION_KEY`, and non-S3
storage when `NODE_ENV=production`.

## Required production variables

Tüm liste ve açıklamalar şablondadır: `docker/.env.production.example`.
Kopyalayıp `docker/.env.production` olarak doldurun (git tarafından yok
sayılır). Kritik olanlar:

- `DATABASE_URL` (compose ağından: `postgres` host), `REDIS_URL` (`redis` host)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (birbirinden farklı, 32+ karakter)
- `CREDENTIALS_ENCRYPTION_KEY` (JWT secret'lardan farklı, 32+ karakter)
- `WEB_DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN` (nginx yönlendirmesi)
- `WEB_URL`, `ADMIN_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_MERCHANT_ID`, `IYZICO_BASE_URL`
- `STORAGE_DRIVER=s3` + bucket/anahtarlar
- Bildirim sağlayıcıları (NetGSM/WhatsApp/SMTP/FCM) isteğe bağlı

Anahtar üretimi: `openssl rand -base64 48`

## Health

- `GET /api/v1/health` — process liveness
- `GET /api/v1/health/ready` — Postgres `SELECT 1` and Redis `PING`

nginx ve harici izleme `liveness` için `/health`ü, trafiği yönlendirmeden
önce `/health/ready`yi kullanmalıdır. Compose, api servisi için aynı
`/health` uç noktasıyla healthcheck tanımlar.

## Docker

Local infrastructure remains `docker/docker-compose.yml` (Postgres + Redis).

Application images:

- `docker/Dockerfile.api` (NestJS dist, node runtime)
- `docker/Dockerfile.web`, `docker/Dockerfile.admin` (Next.js `output:
  standalone` — minimal runtime image, tam `node_modules` kopyalanmaz)

### Dağıtım (repo kökünden; sunucuda repo + Node 22 + pnpm kurulu olmalı)

```bash
# 1. Env dosyasını hazırla
cp docker/.env.production.example docker/.env.production
#    ... tüm değerleri doldur (gerçek alan adları, anahtarlar, S3, iyzico ...)
#    Not: hosttan çalışacak komutlar için DATABASE_URL içindeki host'u
#    "postgres" yerine "localhost" yapan bir kopya tutmak pratiktir.

# 2. TLS sertifikalarını yerleştir (aşağıya bakın)
mkdir -p docker/nginx/certs   # fullchain.pem + privkey.pem

# 3. Migrasyonları uygula (hosttan; Postgres 127.0.0.1:5432'de yayınlanır)
DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" pnpm --filter @xenior/database exec prisma migrate deploy

# 4. Yığını başlat (nginx 80/443 yayınlar; api/web/admin yalnızca iç ağda)
cd docker && docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d && cd ..

# 5. Süper admin oluştur (şifre env/prompt ile, kodda asla)
DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" \
  SUPER_ADMIN_EMAIL=admin@planio.com \
  SUPER_ADMIN_GENERATE=1 \
  node scripts/ensure-super-admin.cjs
```

### TLS sertifikası (Let's Encrypt örneği)

Üç alan adı için tek sertifika (SAN) önerilir:

```bash
sudo certbot certonly --standalone \
  -d planio.com -d www.planio.com -d admin.planio.com -d api.planio.com
sudo cp /etc/letsencrypt/live/planio.com/fullchain.pem docker/nginx/certs/
sudo cp /etc/letsencrypt/live/planio.com/privkey.pem  docker/nginx/certs/
```

Yenileme otomasyonu (`certbot renew` + nginx reload) crontab'a eklenmeli;
sertifika yolları compose volume'u ile kapsayıcıya bağlanır.

### nginx

`docker/nginx/xenior.conf.template` başlangıçta envsubst ile işlenir
(`${WEB_DOMAIN}`, `${ADMIN_DOMAIN}`, `${API_DOMAIN}`). Özellikler: TLS
sonlandırma + HTTP→HTTPS, gzip, `/_next/static/` için immutable önbellek,
12 MB gövde sınırı (dosya yüklemeleri), webhook'lar için buffered olmayan
proxy.

## CI/CD

`.github/workflows/ci.yml` runs install, lint, typecheck, unit tests, API
e2e, and build. It does not deploy. Add a separate workflow only when a
hosting target and secrets are explicitly configured.

Flutter (`apps/mobile`) is outside the pnpm workspace. Run `flutter analyze`
and `flutter test` on a machine with the Flutter SDK before a mobile release.

## Backups

`scripts/backup-postgres.sh` günlük yedek üretir (custom format), retention
uygular (varsayılan 14) ve `BACKUP_S3_URI` verilirse S3'e kopyalar. Cron
örneği script başlığındadır.

- Retain at least 7 daily and 4 weekly copies.
- Test restore on staging before going live:
  `pg_restore --clean --if-exists --dbname "<url>" backups/xenior-<stamp>.dump`
- Redis is a queue/cache. Do not treat it as the system of record.
- Prisma migrations are forward-only in production (`pnpm db:migrate:deploy`).
  Do not use `migrate dev` or `db push` against production.

## Veritabanı bölgesi ve bağlantı havuzu

- Veritabanı sunucuya/regiona yakın seçilmeli. Türkiye kullanıcıları için
  `ap-southeast-1` (Singapur) gibi uzak bölgeler her sorguya ~250 ms ekler;
  `eu-central-1` (Frankfurt) veya TR içi barındırma önerilir.
- `DATABASE_URL`'e `?connection_limit=15` benzeri havuz parametresi ekleyin
  (şablonda varsayılan). Çoklu API replikasında toplam limiti Postgres
  `max_connections` altında tutun; gerekirse PgBouncer ekleyin.

## Monitoring gaps

The API exposes health checks and structured 5xx logs (path, method, error
name). There is no APM, uptime probe, or error tracker wired yet (Sentry
entegrasyonu stub). Lansman sonrası ilk işlerden biri olarak eklenmeli;
öneriler `docs/GO-LIVE-CHECKLIST.md` içinde.
