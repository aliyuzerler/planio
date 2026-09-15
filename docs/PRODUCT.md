# Product

Xenior is a B2B SaaS platform for beauty centers (multi-tenant).

Locked product decisions live in `docs/fazlar/00-kilitli-kararlar.txt`. Phase scopes live in `docs/fazlar/`.

## Scope

Beauty centers (tenants) use the product to manage:

- Customers, staff, services, resources, and calendar
- Appointments created only by the business (no customer self-booking)
- Campaigns and price snapshots
- Staff commissions / earnings
- Pre-accounting: cash accounts, sales, collections, customer ledger, expenses, internal receipts
- Tenant appointment checkout: deposit / full / on-day, payment link, manual POS
- Official documents via Uyumsoft (e-Fatura / SMM) on top of the internal receipt
- Campaign bulk SMS with consent filtering
- Finance summary reports (daily cash, receivables, commissions, expenses)
- Notifications (NetGSM / WhatsApp / SMTP / FCM)
- Xenior subscription billing (iyzico — platform revenue, separate from tenant POS)
- KVKK export / erase (anonymization queue) and owner-facing audit log

Stock, multi-branch, and customer self-booking are out of the first version (backlog: stock later).

## Users

- `BUSINESS_OWNER` — full tenant admin, including Xenior subscription payment, integrations (tenant POS + Uyumsoft), reports, and audit log.
- `BUSINESS_ADMIN` — operations assistant (appointments, staff, services, customers, campaigns). Not the accountant; no POS/integrations/reports/audit.
- `STAFF` — floor operations; own agenda and own commissions; can create appointments; catalog writes closed; no cash/ledger/reports.
- `ACCOUNTANT` — finance only: cash, sales, collections/POS, ledger, expenses, receipts, official documents, reports. No appointment create/edit menu, no catalog writes, no notification setup, no Xenior plan payment, no integration keys.
- Platform administrators use `apps/admin`. Super admins inspect businesses, subscriptions (including six-month licenses), memberships, and platform audit logs. **Tenant cash, sales, ledger, and collections are not exposed to platform admin.**

Appointments are created by business users only (`OWNER`, `ADMIN`, `STAFF`). Customers never create appointments.

## Confirmed business rules

- Each beauty center is a separate tenant. Tenant data must never be accessible by another tenant.
- Header `X-Business-Id` selects the active tenant.
- Appointment statuses: `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- Appointment payment plan: `DEPOSIT` | `FULL` | `ON_DAY` (default). Collections update `paymentStatus` (`UNPAID` / `PARTIAL` / `PAID`).
- Platform iyzico ≠ tenant virtual POS ≠ Uyumsoft credentials.
- Two document layers: internal sales receipt (always available) → optional OfficialDocument via Uyumsoft.
- Subscription billing periods: `MONTHLY` | `SEMIANNUAL` | `YEARLY`. Plan prices live in the database.
- Inactive / expired subscription blocks tenant writes (`SUBSCRIPTION_INACTIVE`).
- Stock is explicitly deferred (backlog note: introduce inventory in a later phase).

## Out of scope for v1

Advanced stock (lots/qty), multi-branch, customer self-booking, full statutory accounting (VAT returns, bank reconciliation).
