# API

NestJS modular monolith. REST only. OpenAPI via Swagger.

## Base

- Prefix: `/api/v1`
- Docs: `/api/docs`
- Health: `GET /api/v1/health`
- Readiness: `GET /api/v1/health/ready`

## Consumers

Web, Flutter mobile, and admin all call this API.

## Error body

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human-readable message",
  "code": "BAD_REQUEST",
  "timestamp": "2026-09-04T18:00:00.000Z",
  "path": "/api/v1/example",
  "details": { "validation": ["field must be a string"] }
}
```

Internal stack traces are not returned to clients.

## Versioning

Breaking changes require a new prefix (`/api/v2`). Phase 1 uses `/api/v1` only.

## Auth

Authentication is centralized in NestJS and shared by web and Flutter clients.

- `POST /api/v1/auth/register`: create User, Business, owner membership, and session
- `POST /api/v1/auth/login`: authenticate email and password
- `POST /api/v1/auth/refresh`: rotate an opaque refresh token
- `POST /api/v1/auth/logout`: revoke the supplied refresh token
- `GET /api/v1/auth/me`: return the authenticated user and memberships

`register`, `login`, `refresh`, and `logout` are public at the JWT guard level.
`me` requires `Authorization: Bearer <access-token>`. The global guard protects
all endpoints by default; explicitly public endpoints use `@Public()`.

Registration creates `User`, `Business`, `BusinessUser`, and the first refresh
session in one database transaction. A subscription is not created at
registration. Until a plan is selected, feature limits are not applied.

Access tokens expire after 15 minutes by default. Refresh tokens expire after
30 days by default and rotate on every use. Token durations are configured
with `JWT_ACCESS_TTL_SECONDS` and `JWT_REFRESH_TTL_SECONDS`.

## Tenant authorization

Authenticated business routes require:

```text
Authorization: Bearer <access-token>
X-Business-Id: <authorized-business-uuid>
```

`X-Business-Id` is validated against the authenticated user's active
`BusinessUser` membership. It is never trusted as authorization by itself.
Global authenticated routes such as `/auth/me` do not require this header.

Tenant authorization may return:

- `TENANT_HEADER_REQUIRED`
- `TENANT_HEADER_INVALID`
- `TENANT_ACCESS_DENIED`
- `TENANT_MEMBERSHIP_INACTIVE`
- `TENANT_BUSINESS_INACTIVE`
- `INSUFFICIENT_BUSINESS_ROLE`
- `INSUFFICIENT_PLATFORM_ROLE`

Lookups by resource ID remain tenant-scoped and return `RESOURCE_NOT_FOUND`
when the record is missing or belongs to another business.

## Business management

Business profile operations use the authenticated tenant context and never
accept a business ID as authority:

- `GET /api/v1/business`: view the selected active business. Available to
  `BUSINESS_OWNER`, `BUSINESS_ADMIN`, and `STAFF`.
- `PATCH /api/v1/business`: update name, phone, email, address, IANA timezone,
  and ISO 4217 currency. Available to `BUSINESS_OWNER` and `BUSINESS_ADMIN`.

Both endpoints require `Authorization` and `X-Business-Id`. The PATCH body is
partial but must contain at least one mutable field. `id`, `status`, and tenant
selection cannot be changed through this endpoint. Nullable contact/address
fields can be cleared with `null`. Successful changes create an append-only
audit entry containing changed field names, not their values.

## Staff management

Staff and specialization routes require the authenticated tenant header.
`BUSINESS_OWNER` and `BUSINESS_ADMIN` can mutate records; `STAFF` has
read-only access.

- `GET /api/v1/staff`: list staff; optional `isActive` and `q` filters
- `POST /api/v1/staff`: create staff, optionally with `specializationIds`
- `GET /api/v1/staff/:id`: return tenant-scoped staff detail
- `PATCH /api/v1/staff/:id`: update profile or active status
- `DELETE /api/v1/staff/:id`: soft-deactivate staff
- `POST /api/v1/staff/:id/specializations`: assign a specialty
- `DELETE /api/v1/staff/:id/specializations/:specializationId`: unassign
- `GET /api/v1/specializations`: list the tenant catalog
- `POST /api/v1/specializations`: add a specialty
- `PATCH /api/v1/specializations/:id`: activate/deactivate a specialty
- `DELETE /api/v1/specializations/:id`: soft-deactivate a specialty

Staff and specialization records are never hard-deleted by these endpoints.
Unassigning deletes only the pure join row. Inactive specialties remain visible
on existing assignments, but cannot be newly assigned. Missing and
cross-tenant resource IDs both return `RESOURCE_NOT_FOUND`.

## Service management

Services are tenant-defined; no global service catalog is hard-coded.
`BUSINESS_OWNER` and `BUSINESS_ADMIN` can mutate services, while `STAFF` has
read-only access.

- `GET /api/v1/services`: list services with optional `isActive` and `q`
- `POST /api/v1/services`: create a service
- `GET /api/v1/services/:id`: get tenant-scoped service detail
- `PATCH /api/v1/services/:id`: update or activate/deactivate
- `DELETE /api/v1/services/:id`: soft-deactivate

Prices are JSON strings with exactly two decimal places and are persisted as
PostgreSQL `NUMERIC(12,2)` through Prisma Decimal. API code never performs
floating-point price arithmetic. Responses derive currency from the selected
Business. Deactivation retains the service row and all historical appointment
snapshot data.

## Customer management

Customers are tenant-owned profiles. `BUSINESS_OWNER` and `BUSINESS_ADMIN`
can create, update, and soft-deactivate customers; `STAFF` has read-only
access including appointment history.

- `GET /api/v1/customers`: paginated list; optional `isActive`, `q`, `page`,
  `pageSize` (default 25, max 100)
- `POST /api/v1/customers`: create a customer
- `GET /api/v1/customers/:id`: tenant-scoped customer detail
- `PATCH /api/v1/customers/:id`: update profile or active status
- `DELETE /api/v1/customers/:id`: soft-deactivate (`isActive: false`)
- `GET /api/v1/customers/:id/appointments`: paginated real appointment history

Search (`q`) is evaluated on the server against first name, last name, phone,
and email. Clients must not load the entire customer table. History uses the
existing `Appointment` relation and returns an empty page when none exist.
Missing and cross-tenant IDs return `RESOURCE_NOT_FOUND`.

## Appointment management

Appointments are created only by authenticated business users. Customers never
create bookings. All active business roles may create, list, reschedule,
cancel, complete, or mark no-show. End time is calculated from the selected
service duration; the client cannot supply `endAt`.

- `GET /api/v1/appointments`: paginated list. Filter with either `date`
  (single business-local `YYYY-MM-DD`) or inclusive `from`/`to` (max 14
  days). Mixing `date` with `from`/`to` is rejected. Also accepts
  `staffId`, `customerId`, `status`, `page`, `pageSize` (max 100). Calendar
  clients must send a bounded window; they must not load unbounded history.
- `POST /api/v1/appointments`: create a confirmed appointment
- `GET /api/v1/appointments/:id`: detail including immutable events
- `PATCH /api/v1/appointments/:id`: update notes only
- `POST /api/v1/appointments/:id/reschedule`: move time and/or parties
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/complete`
- `POST /api/v1/appointments/:id/no-show`

Same-staff overlaps are rejected (`APPOINTMENT_OVERLAP`). Back-to-back
bookings are allowed. Checks run inside a transaction with a per-staff
advisory lock; PostgreSQL also enforces a GiST exclusion constraint on
confirmed ranges. Status changes do not delete rows. Service snapshots are
copied at create time and refreshed only when the service changes on
reschedule.

## Platform administration

`/api/v1/admin/*` is reserved for `SUPER_ADMIN`. Routes use `@SkipTenant()`
and `@RequirePlatformRoles("SUPER_ADMIN")`. They do not accept
`X-Business-Id` as authority. Business users receive
`INSUFFICIENT_PLATFORM_ROLE`. There is no endpoint to change
`platformRole` or a `BusinessUser` role.

- `GET /api/v1/admin/dashboard`: live row counts for businesses,
  subscriptions, users, and payments. Metrics are not estimated.
- `GET /api/v1/admin/businesses`: paginated platform business list
  (`q`, `status`, `page`, `pageSize`)
- `GET /api/v1/admin/businesses/:id`: profile, latest subscription,
  last payment, and memberships with roles
- `PATCH /api/v1/admin/businesses/:id/status`: set `ACTIVE`,
  `SUSPENDED`, or `CLOSED`. Writes `BUSINESS_STATUS_UPDATED`.
- `GET /api/v1/admin/subscriptions`: cross-tenant subscription list
  (`businessId`, `status`, pagination)
- `GET /api/v1/admin/audit-logs`: searchable audit log (`businessId`,
  `userId`, `action`, `entityType`, `entityId`, `from`, `to`)

## Domain modules

Authentication, tenant authorization, business, staff, specialization,
service, customer, appointment, resource, campaign, commission, ledger
(cash/sales/collections/expenses/ledger), checkout (tenant POS + payment
links), invoicing (Uyumsoft official documents), reports, privacy (export /
erase queue), notification, subscription, payment, and platform
administration are implemented.

Platform admin metrics include license counts by billing period
(`MONTHLY` / `SEMIANNUAL` / `YEARLY`). Admin routes must not expose tenant
cash, sales, collections, or ledger balances.

## Ledger and reports

- Cash accounts, counter/appointment sales, collections (`CASH` | `CARD` |
  `LINK`), expenses, customer ledger
- Internal receipt: `POST/GET /api/v1/sales/:id/receipt` (OWNER/ACCOUNTANT write)
- Official document: `POST/GET /api/v1/sales/:id/official-document`
  (`E_FATURA` | `SMM`); requires prior internal receipt
- Tenant POS settings: `GET/PATCH /api/v1/integrations/payments` (OWNER)
- Uyumsoft settings: `GET/PATCH /api/v1/integrations/uyumsoft` (OWNER)
- Public checkout: `GET/POST /api/v1/checkout/:token` (+ `/complete`)
- Appointment payment link: `POST /api/v1/checkout/appointments/:id/link`
- Finance summary: `GET /api/v1/reports/summary?date=` (OWNER/ACCOUNTANT)
- Tenant audit: `GET /api/v1/audit-logs` (OWNER)
- Campaign bulk SMS: `POST /api/v1/campaigns/:id/broadcast-sms` (OWNER/ADMIN;
  skips customers without SMS consent or phone)

## Privacy

- `POST /api/v1/privacy/export` and erase request enqueue a BullMQ job that
  anonymizes customer PII for the tenant (`Anonim` / cleared contacts).

## Subscriptions

Plans are database-driven. Application code must not hard-code catalog
prices. `Plan.limits` is a small JSON document (`maxStaff`, `maxCustomers`,
`advancedFeatures`). A missing limit means unlimited.

- `GET /api/v1/plans`: active plans; OWNER/ADMIN/STAFF
- `GET /api/v1/subscriptions/current`: latest subscription, or `null`
- `GET /api/v1/subscriptions/access`: `hasAccess`, status, plan, limits, usage
- `POST /api/v1/subscriptions/cancel`: mark `CANCELLED` and
  `cancelAtPeriodEnd`; access continues until `currentPeriodEnd`. If an
  iyzico subscription reference exists, the API also calls
  `POST /v2/subscription/subscriptions/{reference}/cancel`.

Checkout starts a `TRIALING` row. The local subscription becomes `ACTIVE`
only after the API retrieves a successful iyzico checkout result or a
verified `subscription.order.success` webhook. `PAST_DUE` is set on a
verified `subscription.order.failure`. Feature access is enforced in the
API. Codes include `SUBSCRIPTION_INACTIVE`, `PLAN_LIMIT_REACHED`,
`FEATURE_NOT_AVAILABLE`, `WEBHOOK_SIGNATURE_INVALID`, and
`PLAN_NOT_MAPPED`.

## Payments

iyzico Checkout Form is the only payment entry. The API never accepts card
numbers or CVV. Amount and currency are copied from the `Plan` row, not
from the client.

- `POST /api/v1/payments/checkout`: OWNER/ADMIN; creates `Payment` +
  iyzico checkout session (`IYZWSv2` to
  `/v2/subscription/checkoutform/initialize`)
- `POST /api/v1/payments/:id/sync`: retrieve
  `/v2/subscription/checkoutform/{token}` and apply the verified result
- `GET /api/v1/payments` and `GET /api/v1/payments/:id`
- `POST /api/v1/payments/iyzico/callback` and `GET` (public): iyzico
  returns `token`; the API retrieves the result, then redirects to web
- `POST /api/v1/payments/iyzico/webhooks` (public): verifies
  `X-IYZ-SIGNATURE-V3` before any state change

Merchant panel URLs: set HTTPS callback/webhook to
`{API_URL}/api/v1/payments/iyzico/callback` and
`{API_URL}/api/v1/payments/iyzico/webhooks`. Subscription notifications
use Settings > Merchant Settings > Merchant Subscription Notifications.

## Notifications

Appointment create, reschedule, and cancel enqueue tenant-scoped
notifications. Delivery is asynchronous over Redis/BullMQ. The API does not
wait for SMS, WhatsApp, or push providers. Providers are selected behind
`NotificationProvider`; development uses mock implementations.

- `GET /api/v1/notifications/settings`
- `PATCH /api/v1/notifications/settings`: OWNER/ADMIN; channels, event
  toggles, and reminder lead time (15–10080 minutes)
- `GET /api/v1/notifications`: paginated delivery log (`status`, `type`,
  `channel`, `page`, `pageSize`)
- `GET /api/v1/notifications/:id`
- `POST /api/v1/notifications/devices`: register the current user's push
  token

Reminders are scheduled from `startAt` minus the configured lead time. A
reschedule or cancel removes pending reminder jobs. Invalid destinations are
not retried; provider failures retry up to five times with exponential
backoff. Terminal status and `errorCode` stay on the `Notification` row.
