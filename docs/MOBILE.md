# Mobile

Flutter application for business staff (`apps/mobile`).

Not React Native. Not Expo.

## Stack

- Flutter / Dart
- Riverpod
- Dio
- GoRouter
- Flutter Secure Storage

## Layout

Feature-oriented, with core / presentation / application / domain / data
separation. Authentication introduces the first complete feature slice.

```
lib/
  core/
    auth/
    config/
    errors/
    network/
    routing/
    storage/
    tenant/
    theme/
  features/
    auth/
      application/
      data/
      presentation/
    business/
      application/
      data/
      presentation/
    staff/
      application/
      data/
      presentation/
    services/
      application/
      data/
      presentation/
    customers/
      application/
      data/
      presentation/
    appointments/
      application/
      data/
      presentation/
    ledger/
      application/
      data/
      presentation/
    commissions/
      application/
      data/
      presentation/
    reports/
      application/
      data/
    home/
      application/
      presentation/
    notifications/
      application/
      data/
  shared/widgets/
```

Feature `application`, `domain`, and `data` layers are introduced only when a
feature requires them. Empty architecture folders are not created.

## Configuration

API base URL comes from compile-time configuration:

```bash
flutter run --dart-define-from-file=env/dev.json
```

`env/dev.json` is gitignored. `env/dev.example.json` is committed.

## Networking

A single Dio client applies base URL, timeouts, auth header injection,
single-flight refresh handling, one-time request retry, and error normalization.

Authentication calls use a separate Dio instance without the auth interceptor.
This prevents a failed `/auth/refresh` request from recursively trying to
refresh itself. Concurrent 401 responses share one refresh request, and a
logout that occurs during refresh cannot recreate the cleared session.

Authenticated domain calls also use a `TenantInterceptor`. It reads the
selected active membership from secure tenant storage and sends
`X-Business-Id`; authentication routes are explicitly excluded.

## Storage

Access and refresh tokens are available only through the `TokenStorage`
abstraction backed by Flutter Secure Storage. Plain-text preferences and files
must not contain tokens.

## Routing

GoRouter listens to the Riverpod auth controller. Unauthenticated sessions are
redirected to `/login`; authenticated sessions cannot remain on login or
registration routes. Tenant-scoped settings require a selected active
membership and redirect to `/select-business` when one is not available.

## Authentication

The mobile auth feature provides login, business registration, session
restore, token refresh, and logout. The NestJS backend remains the authority
for credentials and account status. Tokens stay in Flutter Secure Storage.

## Workspace shell

Authenticated tenant pages use a bottom navigation bar. For OWNER / ADMIN /
STAFF: dashboard, appointments, customers, and an overflow menu. For
`ACCOUNTANT`: dashboard (cash summary), customers (read-only), and overflow —
**no appointments tab and no FAB to create appointments**. Abonelik
(subscription) is hidden from ACCOUNTANT.

## Dashboard

`/` for operations roles loads today's appointments and upcoming confirmed
bookings. OWNER also sees a daily cash summary from
`GET /api/v1/reports/summary`. ACCOUNTANT home is finance-first: daily
collections/expenses/net, receivables, commissions, account balances, plus
shortcuts to sales (POS collect), cash, ledger, and expenses. Receipt numbers
appear on the sales list when issued on web.

## Finance screens

`/sales`, `/cash`, `/ledger`, `/expenses`, and `/earnings` call the shared
ledger/commission APIs. POS collection on sales is OWNER/ACCOUNTANT.
STAFF sees remaining balance / collection notes on appointment detail for
on-day payment; own commissions appear under earnings.

## Business settings

`/settings/business` loads and updates the selected tenant profile through the
shared NestJS API. Owner and admin memberships can edit name, phone, email,
address, IANA timezone, and ISO 4217 currency. Staff memberships receive a
read-only screen; the API independently enforces the same role boundary.
ACCOUNTANT is redirected away from business settings and subscription routes.

## Staff management

`/staff` provides a searchable active/all staff list, while `/staff/:id`
provides contact details, status, and assigned specialties. Owner and admin
memberships can create and edit profiles, activate/deactivate staff, and
assign/unassign or create specialties. STAFF memberships receive read-only
list and detail views. ACCOUNTANT cannot open staff routes.

## Service management

`/services` and `/services/:id` provide tenant-scoped service list and detail
views. Owners and admins can create, edit, activate, and deactivate services;
STAFF receives read-only access. Service prices remain strings throughout the
Dart model and request pipeline and are normalized to two decimal places
without `double` arithmetic.

## Customer management

`/customers` searches the tenant customer list on the server (`q`, pagination)
instead of filtering a full local dump. `/customers/:id` shows profile fields
and real appointment history when any exist. Owners and admins can create,
edit, and deactivate customers; STAFF and ACCOUNTANT are read-only on
customers.

## Appointment management

`/appointments` is a day calendar: today, previous/next, and a date picker.
It loads only the selected day (`from`/`to` on `GET /api/v1/appointments`).
Cards show customer, service, staff, time, payment plan/status, and remaining
amount. Business users (`OWNER` / `ADMIN` / `STAFF`) can open details and
create, reschedule, complete, cancel, or mark no-show. ACCOUNTANT cannot.
Destructive status changes ask for confirmation; completing with remaining
balance warns but does not block. End time is never entered by the client.
Overlap and slot validity stay on the API. Payment links are sent from web;
mobile focuses on agenda + POS note for the day.

## Push notifications

The mobile app registers a device token at
`POST /api/v1/notifications/devices` after a tenant is selected. The
`PushTokenSource` interface is the only FCM/APNs boundary; the default
implementation is a no-op until credentials exist. Appointment logic does
not send push messages from the client.

## Planned capabilities

Bind a real FCM/APNs `PushTokenSource` when provider credentials are
available. Stock/inventory remains out of scope on mobile until a later phase.
