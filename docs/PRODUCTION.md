# Production readiness

This document covers environments, deployment, backups, and remaining
operational risks. It does not replace `SECURITY.md` or `DATABASE.md`.

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | `production` |
| Database | Local Docker Postgres | Isolated Postgres 16 | Isolated Postgres 16 |
| Redis | Local Docker Redis | Isolated Redis 7 | Isolated Redis 7 |
| JWT secrets | Local placeholders allowed | Unique 32+ char secrets | Unique 32+ char secrets, never placeholders |
| iyzico | Mock if keys empty | Sandbox keys | Live keys |
| `IYZICO_BASE_URL` | Sandbox default | `https://sandbox-api.iyzipay.com` | Live iyzico URL from the merchant panel |
| Swagger `/api/docs` | Enabled | Disabled | Disabled |
| CORS | `WEB_URL`, `ADMIN_URL` | Staging origins only | Production origins only |
| Admin | Optional | Required `ADMIN_URL` | Required `ADMIN_URL` |

Never reuse development JWT secrets, database passwords, or iyzico keys in
staging or production. The API rejects placeholder JWT values and missing
iyzico credentials when `NODE_ENV=production`.

## Required production variables

API:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET` (must differ from `JWT_SECRET`)
- `API_URL`
- `WEB_URL`
- `ADMIN_URL`
- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`
- `IYZICO_MERCHANT_ID`
- `IYZICO_BASE_URL`

Web and admin:

- `NEXT_PUBLIC_API_URL` (public API origin, no secrets)

## Health

- `GET /api/v1/health` — process liveness
- `GET /api/v1/health/ready` — Postgres `SELECT 1` and Redis `PING`

Load balancers should use `/health` for liveness and `/health/ready` before
sending traffic.

## Docker

Local infrastructure remains `docker/docker-compose.yml` (Postgres + Redis).

Application images:

- `docker/Dockerfile.api`
- `docker/Dockerfile.web`
- `docker/Dockerfile.admin`

Production compose (`docker/docker-compose.prod.yml`) reads secrets from the
environment. It does not embed development passwords.

```bash
pnpm db:migrate:deploy
docker compose -f docker/docker-compose.prod.yml up --build -d
```

## CI/CD

`.github/workflows/ci.yml` runs install, lint, typecheck, unit tests, API
e2e, and build. It does not deploy. Add a separate workflow only when a
hosting target and secrets are explicitly configured.

Flutter (`apps/mobile`) is outside the pnpm workspace. Run `flutter analyze`
and `flutter test` on a machine with the Flutter SDK before a mobile release.

## Backups

- Take daily Postgres backups (`pg_dump` or the host's managed backup).
- Retain at least 7 daily and 4 weekly copies.
- Test restore on staging before going live.
- Redis is a queue/cache. Do not treat it as the system of record.
- Prisma migrations are forward-only in production (`pnpm db:migrate:deploy`).
  Do not use `migrate dev` or `db push` against production.

## Monitoring gaps

The API exposes health checks and structured 5xx logs (path, method, error
name). There is no APM, uptime probe, or error tracker wired yet. Add one
before public launch.
