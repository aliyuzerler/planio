# Security

## Tenancy

Tenant data must never leak across businesses. Enforcement belongs in the API (and database), not in the UI.

Authenticated tenant routes require an `X-Business-Id` header. The header is a
selection hint, never proof of authorization. The API resolves the current
`BusinessUser` using the authenticated user ID and header value, then rejects
missing, inactive, or cross-business memberships before the handler runs.

The authorization guard order is security-sensitive:

1. `JwtAuthGuard` authenticates and loads the current User.
2. `TenantContextGuard` validates `X-Business-Id` and resolves membership.
3. `BusinessRolesGuard` evaluates `@RequireBusinessRoles(...)`.
4. `PlatformRolesGuard` evaluates `@RequirePlatformRoles(...)`.
5. `RequestContextInterceptor` places the verified context in
   `AsyncLocalStorage` for downstream data access.

Tenant-owned data access obtains `businessId` from this server-created request
context. It must not accept a client body, query parameter, or route value as
the authoritative tenant scope. Resource lookup failure returns the same 404
for a missing record and a record owned by another business.

Public endpoints bypass authentication explicitly with `@Public()`.
Authenticated global endpoints such as `/auth/me` use `@SkipTenant()`.
Business role requirements are declared with metadata decorators rather than
scattered role comparisons.

`SUPER_ADMIN` does not receive an implicit cross-tenant bypass. A route must
explicitly declare `@AllowSuperAdminBypass()` and a platform role requirement,
and must still provide the target `X-Business-Id`. Platform administration
routes under `/admin` instead use `@SkipTenant()` plus
`@RequirePlatformRoles("SUPER_ADMIN")` and query Prisma directly. Ordinary
users cannot influence `platformRole`; the JWT strategy reloads it from the
database. The admin API has no role-escalation endpoints.

Business profile routes have no `:businessId` parameter and reject
client-provided IDs in request bodies. `GET /business` permits active owner,
admin, and staff memberships; `PATCH /business` permits only owner and admin.
The service resolves the target from `RequestContextService`, and each update
writes a minimal audit record in the same transaction.

Staff and specialization IDs are always resolved together with the verified
tenant ID. Assignment operations validate both resources in that same tenant;
cross-tenant and unknown IDs share the `RESOURCE_NOT_FOUND` response. STAFF
members may read staff data but all create, update, activate/deactivate,
assign, and unassign operations require owner or admin authorization.

Service reads and writes scope IDs by the verified tenant before returning or
mutating records. Client-provided business IDs are rejected. Prices are
accepted only as constrained decimal strings, preventing binary
floating-point rounding from affecting persisted monetary values.

Customer reads, writes, search, and appointment history are scoped by the
verified tenant `businessId`. Search runs in the database; the API never
returns an unscoped customer dump. Cross-tenant customer IDs and history
lookups share `RESOURCE_NOT_FOUND`. STAFF may read customers and history;
create, update, and deactivate require owner or admin authorization.

Appointment create/reschedule verifies that customer, staff, and service IDs
belong to the verified tenant before insert. Cross-tenant party IDs return
`RESOURCE_NOT_FOUND`. Overlap rejection is enforced in the API and by a
database exclusion constraint so concurrent booking attempts cannot both
succeed. Appointment rows are never physically deleted.

## Secrets

Never commit `.env` files, API keys, passwords, or JWT secrets. Use `.env.example` as a template only.

Flutter and Next.js public bundles must not contain backend secrets. Web/admin may only use public configuration such as `NEXT_PUBLIC_API_URL`. Mobile may only use public configuration such as `API_URL`.

Required environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL_SECONDS`
- `JWT_REFRESH_TTL_SECONDS`
- `API_URL`
- `WEB_URL`

Optional iyzico variables (never commit real values):

- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`
- `IYZICO_MERCHANT_ID` (subscription webhook V3)
- `IYZICO_BASE_URL` (default sandbox `https://sandbox-api.iyzipay.com`)

## Tokens

Access tokens are signed HS256 JWTs with a short lifetime. Their payload is
limited to user identity and platform role; tenant selection is not embedded
because a user may belong to multiple businesses.

Refresh tokens are 32-byte opaque random values. The API stores only an
HMAC-SHA256 hash using `JWT_REFRESH_SECRET`, never the raw token. Refresh
tokens rotate on every successful use and can be revoked individually.
Suspicious reuse revokes the active token family.

On Flutter, access and refresh tokens are stored only through Flutter Secure
Storage. They are not written to plain-text preferences or files.

On web, the Next.js BFF stores the refresh token in an HttpOnly, SameSite
cookie. Browser JavaScript receives only the short-lived access token and
keeps it in Zustand memory; it is not placed in localStorage or sessionStorage.

Passwords are hashed with Argon2id. Login uses the same generic response for an
unknown email and an incorrect password to reduce account enumeration.

## Authorization

Never trust frontend authorization. Every privileged operation is authorized on the API.

Subscription entitlements are decided in the API. Plan prices and limits come
from `Plan` rows. Staff and customer creation call `assertWithinLimit`;
advanced features use `assertFeature`. The web subscription page is
informational and must not be the only access check.

Payment callbacks and webhooks are untrusted until verified. The API
retrieves the checkout result from iyzico and checks plan reference,
stored amount, and currency. Subscription webhooks must present a valid
`X-IYZ-SIGNATURE-V3` (HMAC-SHA256 over
`merchantId + secretKey + eventType + subscriptionReferenceCode +
orderReferenceCode + customerReferenceCode`). Card numbers, CVV, and
provider secrets are stripped before `Payment.metadata` is stored.

## HTTP hardening

The API applies Helmet headers, a 256 KB JSON/urlencoded body limit, and
global rate limiting (120 requests / minute by default, 30 / minute on
`/auth`). Health checks skip the limiter. Swagger is disabled when
`NODE_ENV=production`. Unexpected 5xx responses return a generic body;
server logs include path, method, and error name only. Passwords, tokens,
and card-like fields are redacted by the shared redact helper.

## CORS

The API allows the configured web and admin origins.
