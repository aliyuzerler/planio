# Xenior

Multi-tenant B2B SaaS platform for beauty centers. Business staff manage customers, staff, services, appointments, calendar, notifications, and subscriptions.

This repository is a pnpm + Turborepo monorepo. The Flutter mobile app lives in `apps/mobile` and is intentionally outside the JavaScript workspace.

## Applications

- `apps/web` — Next.js app for beauty center businesses
- `apps/admin` — Next.js app for platform administration
- `apps/api` — NestJS modular-monolith REST API
- `apps/mobile` — Flutter app for business staff

## Local development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and
[docs/PRODUCTION.md](docs/PRODUCTION.md).
