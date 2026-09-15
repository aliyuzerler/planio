# Development

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop (PostgreSQL and Redis)
- Flutter stable (for `apps/mobile`)
- Dart SDK bundled with Flutter

## Install

```bash
corepack enable
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/mobile/env/dev.example.json apps/mobile/env/dev.json
```

On PowerShell, use `Copy-Item` instead of `cp` if the `cp` alias is unavailable.
The Android emulator reaches the host through `10.0.2.2`; use the development
machine's reachable address on a physical device.

Generate the Prisma client after `DATABASE_URL` is available:

```bash
pnpm db:generate
```

## Local infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

Default local values (not for production):

- PostgreSQL: use the `DATABASE_URL` and `POSTGRES_*` values from `.env`
- Redis: `redis://localhost:6379`

## Run applications

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:admin
```

The web app uses a protected workspace shell (sidebar, header, main) for
`/dashboard` and `/settings/*`. The admin app uses the same pattern for
platform pages and admits only `SUPER_ADMIN`. Authentication stays on the
BFF cookie refresh path; the frontend does not decide slot validity or
plan limits.

Component tests live in `apps/web/src/**/*.test.ts(x)` and
`apps/admin/src/**/*.test.ts(x)` (Vitest). Web end-to-end flows are
Playwright specs under `apps/web/e2e`. Platform admin authorization is
covered by `apps/api/test/admin.e2e-spec.ts`.

Default URLs:

- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Health: http://localhost:3001/api/v1/health
- Web: http://localhost:3000
- Admin: http://localhost:3002

Flutter (from `apps/mobile`):

```bash
flutter pub get
flutter run --dart-define-from-file=env/dev.json
```

The admin app uses a protected platform shell. Only `SUPER_ADMIN` sessions
are admitted. Component tests live in `apps/admin/src/**/*.test.ts(x)`.

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, unit tests,
API e2e, and build. It does not deploy. Production configuration is in
`docs/PRODUCTION.md`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm db:validate
pnpm build
```

Flutter:

```bash
cd apps/mobile
flutter doctor
flutter analyze
flutter test
```

The mobile application identifier is `com.xenior.mobile`.

## iyzico sandbox

Leave `IYZICO_API_KEY` empty to use the mock checkout provider. For the
real sandbox, copy keys only into local `.env` files (never the repo),
set `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`, store each iyzico
pricing-plan reference on `Plan.externalPricingPlanCode`, and point
merchant notification URLs at the public API callback/webhook paths.
