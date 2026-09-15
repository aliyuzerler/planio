# Architecture

## Shape

The backend is a **modular monolith** (NestJS). It is not a set of microservices. NestJS modules define domain boundaries so a domain can be extracted later if needed.

Frontends do not own business rules. The same REST API is consumed by:

- Next.js web (`apps/web`)
- Flutter mobile (`apps/mobile`)
- Next.js admin (`apps/admin`)

## Repository

pnpm + Turborepo monorepo for TypeScript applications and packages. The Flutter app is a first-class Flutter project and is **not** part of the pnpm workspace.

```
apps/web      Next.js business application
apps/admin    Next.js platform admin application
apps/api      NestJS REST API
apps/mobile   Flutter staff application
packages/database   Prisma + PostgreSQL
packages/types      Shared TypeScript types
packages/validation Shared Zod schemas
packages/config     Environment schemas
packages/ui         Shared React helpers
```

`apps/mobile` is intentionally excluded from `pnpm-workspace.yaml`. Dart and
Flutter dependencies are managed only by `pub`.

The React applications use App Router, Tailwind CSS, TanStack Query, and the
shared shadcn/ui-compatible primitives in `packages/ui`. The web app renders a
sidebar/header/main workspace shell for authenticated tenant pages. The admin
app uses the same shell pattern for platform pages and admits only
`SUPER_ADMIN` sessions. Zustand is available for client-only global state and
holds each app's in-memory authentication session.

## Tenancy

`Business` is the tenant root. `User` is a global identity and is linked to one
or more businesses through `BusinessUser`, which carries the user's
business-specific role. Platform-level `SUPER_ADMIN` authorization is stored
separately on `User` and must not be confused with tenant membership.

Every tenant-owned database model has a required `businessId`. Critical
relations also use composite foreign keys containing `businessId`, preventing
cross-tenant links at the database level. For example, an appointment cannot
reference a customer, staff member, or service from another business.

Database constraints are defense in depth. The API must derive the active
business from authenticated server-side membership, scope every read and
write by that `businessId`, and never trust a tenant identifier supplied by a
client. Cross-business access for platform administrators must use explicit,
separately authorized code paths.

## Authorization architecture

Clients select a tenant with `X-Business-Id`; the value is not placed in the
JWT because a User may have multiple memberships. The global guard pipeline
authenticates the User, resolves an active `BusinessUser`, checks declarative
business/platform role metadata, and attaches a verified authorization
context to the request.

The verified context is propagated with `AsyncLocalStorage`.
`TenantResourceAccessService` reads the tenant from that server-owned context
and scopes ownership checks for Customer, Staff, Service, Appointment,
Subscription, Notification, and AuditLog. Domain modules must use this pattern
instead of accepting a raw `businessId` as authority.

Role checks use `@RequireBusinessRoles(...)` and
`@RequirePlatformRoles(...)`. Global authenticated routes opt out of tenant
resolution with `@SkipTenant()`. `SUPER_ADMIN` bypass is denied by default and
requires an explicit `@AllowSuperAdminBypass()` declaration on the route.

```text
Bearer JWT
  -> JwtAuthGuard
  -> TenantContextGuard (X-Business-Id + BusinessUser)
  -> BusinessRolesGuard / PlatformRolesGuard
  -> RequestContextInterceptor
  -> tenant-scoped service
```

## Business management

`BusinessModule` is the first tenant-scoped domain module. Its public service
methods do not accept a `businessId`; they read the verified tenant from
`RequestContextService`. Profile reads are available to all active business
roles, while updates use declarative owner/admin role metadata. Mutable profile
fields are name, contact details, address, IANA timezone, and ISO 4217 currency.

Profile updates and their audit entry are committed in one database
transaction. Audit metadata stores only changed field names. The web and mobile
clients derive tenant selection from active memberships returned by
`/auth/me`, then send that selection in `X-Business-Id`; the API remains the
authorization authority.

## Staff management

`StaffModule` owns staff profiles, the tenant specialization catalog, and
staff-specialization assignments. Reads are available to every active business
role; mutations require owner or admin. Service methods obtain `businessId`
from `RequestContextService` and scope every lookup, including both sides of an
assignment.

Staff and specialization removal uses `isActive` rather than physical deletion
so appointment history and existing classification remain intact. Only the
pure `StaffSpecialization` join row is deleted when an assignment is removed.
Every mutation writes an audit record in the same transaction without storing
contact values in audit metadata.

## Service management

`ServicesModule` manages each tenant's own service catalog. Prices cross API
boundaries as fixed two-decimal strings and are stored with Prisma Decimal;
JavaScript floating-point arithmetic is not used. Currency is inherited from
the verified Business context.

Service lifecycle is soft: deactivation changes `isActive` and never removes
the row. Appointments independently snapshot service name, duration, price,
and currency, preserving historical meaning after later service changes.
There is currently no staff-service join model. Appointment booking validates
that the chosen staff member and service both belong to the tenant and are
active; it does not require a staff-service assignment row.

## Database architecture

The PostgreSQL schema is managed by Prisma in `packages/database`. The model
covers identity and membership (including `ACCOUNTANT`), staff, customers,
services, resources, appointments, campaigns, commissions, pre-accounting
(sales / collections / cash / ledger / expenses / receipts), tenant checkout
and Uyumsoft official documents, subscription billing (including
`SEMIANNUAL`), notifications, privacy erase/export, and audit logs.

Stock/inventory is deferred. Platform admin APIs must not read tenant finance
tables (sales, collections, cash, ledger). See `docs/DATABASE.md`.

## Domain modules (current)

Beyond auth, business, staff, services, customers, and appointments the API
includes campaigns, commissions, ledger, checkout, invoicing (Uyumsoft),
reports (`GET /reports/summary` for OWNER + ACCOUNTANT), tenant audit logs
(OWNER), privacy erase queue, subscriptions/payments, and notifications.

## API

- REST
- Version prefix: `/api/v1`
- OpenAPI / Swagger
- Consistent error body: `statusCode`, `error`, `message`, `code`, `timestamp`, `path`, optional `details`

## Authentication

NestJS is the only authentication authority. Passwords use Argon2id, access
tokens are short-lived JWTs, and database-backed opaque refresh tokens support
rotation and revocation.

Flutter calls the NestJS API directly and stores tokens in secure platform
storage. Browser auth requests pass through same-origin Next.js BFF route
handlers: the BFF stores the refresh token as an HttpOnly cookie while the
access token remains in browser memory. Both clients use the same underlying
NestJS auth contract and reusable JWT guard.

Appointment resources are tenant-scoped. Create, reschedule, and status
transitions run in a database transaction, lock the staff calendar, and
record `AppointmentEvent` history. Overlaps are rejected in application
logic and by a PostgreSQL exclusion constraint. Web day/week calendars and
the mobile day agenda consume the same list endpoint with a bounded
`from`/`to` (or `date`) window; clients do not decide whether a slot is
valid.

Customer resources are tenant-scoped and paginated:

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:id`
- `PATCH /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`
- `GET /api/v1/customers/:id/appointments`

## Notifications

`NotificationService` persists a delivery row, then `NotificationQueue`
hands work to BullMQ. A worker calls `NotificationProvider` by channel
(`SmsProvider`, `WhatsAppProvider`, `PushProvider`). Appointment code only
emits a port event; it never imports a vendor SDK. Development providers
are mocks. Failed rows keep `errorCode` / `errorMessage` and stop after a
bounded retry budget.

## Subscriptions

`SubscriptionsService` reads the `Plan` catalog from PostgreSQL. Prices and
limits live on the plan row, not in application constants.
`SubscriptionAccessService` is the backend source of truth for whether a
business may use the product, stay within staff/customer limits, or use an
advanced feature. Web UI reflects that state; it does not decide
entitlements.

A business without a subscription, or with only `TRIALING` checkout, stays
unrestricted. Limits apply after a verified `ACTIVE` / `PAST_DUE` /
in-period `CANCELLED` plan. Cancel keeps access until `currentPeriodEnd`,
then the row becomes `EXPIRED`.

## Payments

Subscription billing uses the current iyzico Subscription Checkout Form
API, authenticated with `IYZWSv2` (HMAC-SHA256 of
`randomKey + uriPath + body`). The official card NON3D initialize is not
used so card data never enters Xenior.

Flow:

1. Owner/admin selects a database plan.
2. `PaymentsService` stores amount/currency from `Plan`, creates a
   `PENDING`/`PROCESSING` payment, and calls
   `/v2/subscription/checkoutform/initialize`.
3. The buyer completes payment on iyzico.
4. Callback or `sync` calls `GET /v2/subscription/checkoutform/{token}`.
   Frontend success is ignored.
5. Webhooks (`subscription.order.success` / `failure`, and
   `CHECKOUT_FORM_AUTH`) are verified with `X-IYZ-SIGNATURE-V3` as
   documented by iyzico. Invalid signatures are rejected.
6. On verified success the payment becomes `SUCCEEDED` and the
   subscription becomes `ACTIVE`. Recurring success extends the period;
   failure sets `PAST_DUE`.

Idempotency: `(provider, externalPaymentId)` is unique. A second webhook
with the same `orderReferenceCode` is a no-op. Already-`SUCCEEDED`
payments are not downgraded by a late failure.

When `IYZICO_API_KEY` and `IYZICO_SECRET_KEY` are absent, a mock provider
is used for local/tests. Sandbox base URL defaults to
`https://sandbox-api.iyzipay.com`. Map each `Plan` to an iyzico pricing
plan with `Plan.externalPricingPlanCode`. Appointment deposits are not
part of the product.

## Platform administration

`AdminModule` exposes `/admin/*` without tenant resolution. Services query
Prisma with explicit filters and never call `requireTenant()`. Business
status changes write `BUSINESS_STATUS_UPDATED` in the same transaction.
Membership roles are returned for display only; the module has no role
mutation API.

## Mobile

Flutter, Dart, Riverpod, Dio, GoRouter, Flutter Secure Storage. Feature-oriented folders with presentation / application / domain / data / core. Tokens are stored only in secure storage.

## Production operations

The API applies Helmet, request size limits, and rate limiting. Health
exposes liveness (`/health`) and dependency readiness (`/health/ready`).
Application Dockerfiles live under `docker/`. CI lints, tests, and builds
but does not deploy. See `docs/PRODUCTION.md`.

## Infrastructure

Local PostgreSQL and Redis run in Docker Compose. Redis is the backing store for BullMQ. Application processes run on the host during development.
